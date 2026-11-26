import Phaser from 'phaser';
import { WORKSTATION_META } from '../../app/routerContract';
import type {
  AvatarChatBubblePayload,
  AvatarMovePacket,
  CharacterSpriteKey,
  RemotePlayerPresence,
  WorkstationId,
} from '../../types/contracts';
import type { AvatarDirection, LearnNexusGameApi } from '../../types/gameDebug';
import { eventBridge } from '../bridge/eventBridge';
import mapData from '../maps/campusStudioMap.json';

const TILE_SIZE = 16;
const MOVE_SPEED_TILES_PER_SEC = 4.2;
const MOBILE_BREAKPOINT_PX = 640;
const MOVE_BROADCAST_INTERVAL_MS = 80;
const PEER_PROXIMITY_RADIUS_PX = 64;
const CHAT_BUBBLE_TTL_MS = 5000;
const CHAT_BUBBLE_MAX_CHARS = 56;
const NAMETAG_MAX_CHARS = 28;
const REMOTE_LERP_RATE = 12;
const REMOTE_IDLE_STALE_MS = 450;

const FONT_STACK =
  "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const CHARACTER_SPECS: ReadonlyArray<{
  key: CharacterSpriteKey;
  prefix: string;
}> = [
  { key: 'adam', prefix: 'Adam' },
  { key: 'alex', prefix: 'Alex' },
  { key: 'amelia', prefix: 'Amelia' },
  { key: 'bob', prefix: 'Bob' },
];

const VALID_SPRITE_KEYS: ReadonlyArray<CharacterSpriteKey> = [
  'adam',
  'alex',
  'amelia',
  'bob',
];

const VALID_FACINGS: ReadonlyArray<AvatarDirection> = [
  'right',
  'up',
  'left',
  'down',
];

const TEXTURE_KEYS = [
  'room_builder_16',
  'interiors_16',
  'adam_idle',
  'adam_idle_anim',
  'adam_run',
  'alex_idle_anim',
  'alex_run',
  'amelia_idle_anim',
  'amelia_run',
  'bob_idle_anim',
  'bob_run',
] as const;

const WORKSTATION_ID_MAP: Record<string, WorkstationId | undefined> = {
  'workstation-overview': 'overview',
  'meeting-table': 'tasks',
  'resource-shelf': 'resources',
  'whiteboard-board': 'whiteboard',
};

const TELEPORT_TARGETS: Record<WorkstationId, { x: number; y: number }> = {
  overview: { x: 2.8, y: 6.5 },
  tasks: { x: 11.25, y: 9.1 },
  resources: { x: 19.5, y: 4.9 },
  whiteboard: { x: 14.4, y: 4.0 },
};

interface MapObjectSpec {
  id: string;
  spriteNum: string;
  tileX: number;
  tileY: number;
  collidable: boolean;
  layer: 'wall_decor' | 'floor_decor' | 'furniture';
  collider?: {
    offsetX: number;
    offsetY: number;
    widthTiles: number;
    heightTiles: number;
  };
  interaction?: {
    objectId: string;
    label: string;
    category: string;
    radiusTiles: number;
    summary: string;
    notes: string;
  };
}

interface InteractableRuntime {
  workstationId: WorkstationId;
  label: string;
  sprite: Phaser.GameObjects.Image;
  centerX: number;
  centerY: number;
  radiusPx: number;
}

interface RemoteAvatarRuntime {
  userId: string;
  displayName: string;
  spriteKey: CharacterSpriteKey;
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  lastSyncX: number | null;
  lastSyncY: number | null;
  facing: AvatarDirection;
  moving: boolean;
  lastMovePacketAt: number;
  nametagBg: Phaser.GameObjects.Graphics;
  nametagText: Phaser.GameObjects.Text;
  nametagHeight: number;
}

interface ChatBubbleRuntime {
  userId: string;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  boxHeight: number;
  expiresAt: number;
}

interface MovementCursors {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

function isTextInputFocused(): boolean {
  const active = document.activeElement;
  if (!active || !(active instanceof HTMLElement)) {
    return false;
  }
  const tag = active.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    active.isContentEditable
  );
}

function normalizeSpriteKey(key: unknown): CharacterSpriteKey {
  return typeof key === 'string' &&
    (VALID_SPRITE_KEYS as readonly string[]).includes(key)
    ? (key as CharacterSpriteKey)
    : 'adam';
}

function normalizeFacing(facing: unknown): AvatarDirection {
  return typeof facing === 'string' &&
    (VALID_FACINGS as readonly string[]).includes(facing)
    ? (facing as AvatarDirection)
    : 'down';
}

function truncateLabel(raw: string, maxChars: number): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
}

function areStringArraysEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export class CampusScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: InteractableRuntime[] = [];
  private nearby: InteractableRuntime | null = null;
  private promptMarker!: Phaser.GameObjects.Graphics;
  private proximityRings!: Phaser.GameObjects.Graphics;

  private remoteAvatars = new Map<string, RemoteAvatarRuntime>();
  private chatBubbles = new Map<string, ChatBubbleRuntime>();
  private nearbyPeerIds: string[] = [];

  private cursors: MovementCursors | null = null;
  private wasd: WasdKeys | null = null;

  private facing: AvatarDirection = 'down';
  private localUserId = '';
  private localDisplayName = '';
  private localSpriteKey: CharacterSpriteKey = 'adam';
  private panelOpen = false;
  private externalInputFocused = false;
  private wasMoving = false;
  private lastMoveEmitAt = 0;
  private ready = false;
  private cleanedUp = false;
  private worldW = mapData.width * TILE_SIZE;
  private worldH = mapData.height * TILE_SIZE;

  private bridgeUnsubs: Array<() => void> = [];
  private debugApi?: LearnNexusGameApi;

  constructor() {
    super({ key: 'CampusScene' });
  }

  preload(): void {
    this.load.image(
      'room_builder_16',
      '/assets/tilesets/Room_Builder_free_16x16.png',
    );
    this.load.atlas(
      'interiors_16',
      '/assets/atlases/interiors_16x16.png',
      '/assets/atlases/interiors_16x16.json',
    );
    this.load.spritesheet(
      'adam_idle',
      '/assets/characters/Adam_idle_16x16.png',
      { frameWidth: 16, frameHeight: 32 },
    );

    for (const { key, prefix } of CHARACTER_SPECS) {
      this.load.spritesheet(
        `${key}_idle_anim`,
        `/assets/characters/${prefix}_idle_anim_16x16.png`,
        { frameWidth: 16, frameHeight: 32 },
      );
      this.load.spritesheet(
        `${key}_run`,
        `/assets/characters/${prefix}_run_16x16.png`,
        { frameWidth: 16, frameHeight: 32 },
      );
    }
  }

  create(): void {
    this.cleanedUp = false;
    this.panelOpen = false;
    this.externalInputFocused = false;
    this.nearby = null;
    this.nearbyPeerIds = [];
    this.wasMoving = false;
    this.lastMoveEmitAt = 0;
    this.worldW = mapData.width * TILE_SIZE;
    this.worldH = mapData.height * TILE_SIZE;

    for (const key of TEXTURE_KEYS) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    this.buildTileLayers();
    this.buildStaticTileColliders();
    this.buildObjects();
    this.proximityRings = this.add.graphics().setDepth(9);
    this.buildPlayer();

    this.promptMarker = this.add.graphics().setDepth(9990);

    this.applyCameraLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', this.handleResize, this);

    this.setupKeyboard();
    this.subscribeBridgeEvents();
    this.registerLifecycleCleanup();

    this.installDebugApi();
    this.ready = true;
    this.refreshProximity(0);
    this.refreshPeerProximity();
    this.game.events.emit('campus:ready');
  }

  update(time: number, delta: number): void {
    if (!this.ready || this.cleanedUp) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (
      !this.panelOpen &&
      !this.externalInputFocused &&
      !isTextInputFocused() &&
      this.cursors &&
      this.wasd
    ) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    }

    if (vx !== 0 || vy !== 0) {
      const speed = MOVE_SPEED_TILES_PER_SEC * TILE_SIZE;
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.facing = vx < 0 ? 'left' : 'right';
      } else {
        this.facing = vy < 0 ? 'up' : 'down';
      }
      this.player.play(`${this.localSpriteKey}_run_${this.facing}`, true);

      if (
        !this.wasMoving ||
        time - this.lastMoveEmitAt >= MOVE_BROADCAST_INTERVAL_MS
      ) {
        this.emitLocalMove(true, time);
      }
      this.wasMoving = true;
    } else {
      body.setVelocity(0, 0);
      this.player.play(`${this.localSpriteKey}_idle_anim_${this.facing}`, true);
      if (this.wasMoving) {
        this.wasMoving = false;
        this.emitLocalMove(false, time);
      }
    }

    this.player.setDepth(10 + this.player.y);
    this.updateRemoteAvatars(time, delta);
    this.refreshProximity(time);
    this.refreshPeerProximity();
    this.updateChatBubbles(time);
  }

  private buildTileLayers(): void {
    const layers: Array<{ data: number[][]; depth: number }> = [
      { data: mapData.layers.floor, depth: 0 },
      { data: mapData.layers.walls, depth: 1 },
      { data: mapData.layers.borders, depth: 2 },
    ];

    for (const layerSpec of layers) {
      const tilemap = this.make.tilemap({
        data: layerSpec.data,
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE,
      });
      const tileset = tilemap.addTilesetImage(
        'room_builder_16',
        'room_builder_16',
        TILE_SIZE,
        TILE_SIZE,
        0,
        0,
      );
      if (tileset) {
        tilemap.createLayer(0, tileset, 0, 0)?.setDepth(layerSpec.depth);
      }
    }
  }

  private buildStaticTileColliders(): void {
    this.colliders = this.physics.add.staticGroup();
    for (let r = 0; r < mapData.height; r++) {
      for (let c = 0; c < mapData.width; c++) {
        if (mapData.layers.collision[r][c] === 1) {
          const zone = this.add.zone(
            c * TILE_SIZE + TILE_SIZE / 2,
            r * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
          );
          this.physics.add.existing(zone, true);
          this.colliders.add(zone);
        }
      }
    }
  }

  private buildObjects(): void {
    this.interactables = [];
    for (const obj of mapData.objects as MapObjectSpec[]) {
      const frameName = `int16_obj_${obj.spriteNum}`;
      const px = Math.round(obj.tileX * TILE_SIZE);
      const py = Math.round(obj.tileY * TILE_SIZE);
      const img = this.add
        .image(px, py, 'interiors_16', frameName)
        .setOrigin(0, 0);

      if (obj.layer === 'floor_decor') {
        img.setDepth(3);
      } else if (obj.layer === 'wall_decor') {
        img.setDepth(4);
      } else {
        img.setDepth(10 + py + img.height);
      }

      if (obj.collidable && obj.collider) {
        const cw = Math.max(4, Math.round(obj.collider.widthTiles * TILE_SIZE));
        const ch = Math.max(4, Math.round(obj.collider.heightTiles * TILE_SIZE));
        const cx = Math.round(px + obj.collider.offsetX * TILE_SIZE + cw / 2);
        const cy = Math.round(py + obj.collider.offsetY * TILE_SIZE + ch / 2);
        const zone = this.add.zone(cx, cy, cw, ch);
        this.physics.add.existing(zone, true);
        this.colliders.add(zone);
      }

      const workstationId = obj.interaction
        ? WORKSTATION_ID_MAP[obj.interaction.objectId]
        : undefined;
      if (obj.interaction && workstationId) {
        const runtime: InteractableRuntime = {
          workstationId,
          label: WORKSTATION_META[workstationId].title,
          sprite: img,
          centerX: px + img.width / 2,
          centerY: py + img.height / 2,
          radiusPx: obj.interaction.radiusTiles * TILE_SIZE,
        };
        this.interactables.push(runtime);

        img.setInteractive({ useHandCursor: true });
        img.on('pointerdown', () => {
          if (this.nearby === runtime && !this.panelOpen) {
            this.triggerInteraction(runtime);
          }
        });
      }
    }
  }

  private buildPlayer(): void {
    this.registerCharacterAnimations();
    const spawnX = Math.round(mapData.spawn.tileX * TILE_SIZE);
    const spawnY = Math.round(mapData.spawn.tileY * TILE_SIZE);
    this.facing = (mapData.spawn.facing as AvatarDirection) || 'down';

    this.player = this.physics.add.sprite(
      spawnX,
      spawnY,
      `${this.localSpriteKey}_idle_anim`,
      18,
    );
    this.player.setScale(1);
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    if (this.localDisplayName) {
      this.player.setName(this.localDisplayName);
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6);
    body.setOffset(3, 25);

    this.physics.add.collider(this.player, this.colliders);
    this.player.play(`${this.localSpriteKey}_idle_anim_${this.facing}`);
    this.player.setDepth(10 + this.player.y);
  }

  private registerCharacterAnimations(): void {
    const directions: Array<{ dir: AvatarDirection; start: number; end: number }> = [
      { dir: 'right', start: 0, end: 5 },
      { dir: 'up', start: 6, end: 11 },
      { dir: 'left', start: 12, end: 17 },
      { dir: 'down', start: 18, end: 23 },
    ];

    for (const { key } of CHARACTER_SPECS) {
      for (const { dir, start, end } of directions) {
        const idleKey = `${key}_idle_anim_${dir}`;
        if (!this.anims.exists(idleKey)) {
          this.anims.create({
            key: idleKey,
            frames: this.anims.generateFrameNumbers(`${key}_idle_anim`, {
              start,
              end,
            }),
            frameRate: 8,
            repeat: -1,
          });
        }

        const runKey = `${key}_run_${dir}`;
        if (!this.anims.exists(runKey)) {
          this.anims.create({
            key: runKey,
            frames: this.anims.generateFrameNumbers(`${key}_run`, {
              start,
              end,
            }),
            frameRate: 10,
            repeat: -1,
          });
        }
      }
    }
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    this.applyCameraLayout(gameSize.width, gameSize.height);
    for (const runtime of this.remoteAvatars.values()) {
      this.redrawRemoteNametag(runtime);
      this.positionRemoteNametag(runtime);
    }
    for (const bubble of this.chatBubbles.values()) {
      this.redrawChatBubble(bubble);
    }
    this.updateChatBubblesPosition();
  };

  private applyCameraLayout(viewportWidth: number, viewportHeight: number): void {
    const cam = this.cameras.main;
    const zoom = viewportWidth < MOBILE_BREAKPOINT_PX ? 2 : 3;
    cam.setZoom(zoom);
    cam.setRoundPixels(true);

    const visibleW = viewportWidth / zoom;
    const visibleH = viewportHeight / zoom;

    if (visibleW >= this.worldW && visibleH >= this.worldH) {
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(Math.round(this.worldW / 2), Math.round(this.worldH / 2));
      return;
    }

    // Center axes that fit entirely inside the viewport while following on overflowing axes.
    const boundsX = visibleW >= this.worldW ? (this.worldW - visibleW) / 2 : 0;
    const boundsY = visibleH >= this.worldH ? (this.worldH - visibleH) / 2 : 0;
    const boundsW = visibleW >= this.worldW ? visibleW : this.worldW;
    const boundsH = visibleH >= this.worldH ? visibleH : this.worldH;

    cam.setBounds(boundsX, boundsY, boundsW, boundsH);
    cam.startFollow(this.player, true, 1, 1);

    if (visibleW >= this.worldW) {
      cam.centerOnX(Math.round(this.worldW / 2));
    }
    if (visibleH >= this.worldH) {
      cam.centerOnY(Math.round(this.worldH / 2));
    }
  }

  private setupKeyboard(): void {
    if (!this.input.keyboard) {
      return;
    }

    // Omit Space and Shift from global captures so focused React buttons remain Space-activatable.
    this.cursors = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, true),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, true),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, true),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, true),
    };
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };

    this.input.keyboard.on('keydown-E', this.handleKeyDownE, this);
  }

  private readonly handleKeyDownE = (event: KeyboardEvent): void => {
    if (
      event.repeat ||
      this.panelOpen ||
      this.externalInputFocused ||
      !this.nearby ||
      isTextInputFocused()
    ) {
      return;
    }
    this.triggerInteraction(this.nearby);
  };

  private subscribeBridgeEvents(): void {
    this.bridgeUnsubs.push(
      eventBridge.on('workstation:interact', () => {
        this.enterPanelOpenState();
      }),
      eventBridge.on('panel:closed', () => {
        this.panelOpen = false;
        if (this.input.keyboard && !this.externalInputFocused) {
          this.input.keyboard.enabled = true;
          this.input.keyboard.enableGlobalCapture();
          this.input.keyboard.resetKeys();
        }
      }),
      eventBridge.on('ui:input-focus', ({ focused }) => {
        this.externalInputFocused = focused;
        if (focused) {
          this.stopLocalMovement();
          if (this.input.keyboard) {
            this.input.keyboard.disableGlobalCapture();
            this.input.keyboard.resetKeys();
          }
        } else if (!this.panelOpen && this.input.keyboard) {
          this.input.keyboard.enabled = true;
          this.input.keyboard.enableGlobalCapture();
          this.input.keyboard.resetKeys();
        }
      }),
      eventBridge.on('avatar:local-identity', (payload) => {
        this.handleLocalIdentity(payload);
      }),
      eventBridge.on('avatar:remote-sync', (payload) => {
        this.handleRemoteSync(payload.players);
      }),
      eventBridge.on('avatar:remote-move', (packet) => {
        this.handleRemoteMove(packet);
      }),
      eventBridge.on('avatar:remote-leave', ({ userId }) => {
        if (this.localUserId && userId === this.localUserId) {
          return;
        }
        this.removeRemoteAvatar(userId);
        this.refreshPeerProximity();
      }),
      eventBridge.on('avatar:chat-bubble', (payload) => {
        this.handleChatBubble(payload);
      }),
    );
  }

  private enterPanelOpenState(): void {
    this.panelOpen = true;
    this.stopLocalMovement();
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
      this.input.keyboard.disableGlobalCapture();
      this.input.keyboard.resetKeys();
    }
  }

  private stopLocalMovement(): void {
    const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setVelocity(0, 0);
    if (this.player && this.ready && !this.cleanedUp) {
      this.player.play(`${this.localSpriteKey}_idle_anim_${this.facing}`, true);
    }
    if (this.wasMoving) {
      this.wasMoving = false;
      this.emitLocalMove(false);
    }
  }

  private emitLocalMove(moving: boolean, time?: number): void {
    if (!this.player || this.cleanedUp) {
      return;
    }
    this.lastMoveEmitAt = time ?? this.time?.now ?? 0;
    eventBridge.emit('avatar:local-move', {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.facing,
      moving,
    });
  }

  private handleLocalIdentity(payload: {
    userId: string;
    displayName: string;
    spriteKey: CharacterSpriteKey;
  }): void {
    this.localUserId = payload.userId;
    this.localDisplayName = payload.displayName;
    this.localSpriteKey = normalizeSpriteKey(payload.spriteKey);

    if (this.localUserId && this.remoteAvatars.has(this.localUserId)) {
      this.removeRemoteAvatar(this.localUserId);
      this.refreshPeerProximity();
    }

    if (this.player && !this.cleanedUp) {
      this.player.setName(this.localDisplayName);
      const animKey = `${this.localSpriteKey}_${this.wasMoving ? 'run' : 'idle_anim'}_${this.facing}`;
      this.player.play(animKey, true);
    }
  }

  private handleRemoteSync(players: RemotePlayerPresence[]): void {
    if (this.cleanedUp) {
      return;
    }
    const previousIds = new Set(this.remoteAvatars.keys());
    const nextIds = new Set<string>();
    let hasNewPeer = false;

    for (const player of players) {
      if (this.localUserId && player.userId === this.localUserId) {
        continue;
      }
      nextIds.add(player.userId);
      if (!previousIds.has(player.userId)) {
        hasNewPeer = true;
      }
      this.upsertRemoteAvatarFromPresence(player);
    }

    for (const existingId of previousIds) {
      if (!nextIds.has(existingId)) {
        this.removeRemoteAvatar(existingId);
      }
    }

    this.refreshPeerProximity();

    if (hasNewPeer && this.ready && this.player) {
      this.emitLocalMove(this.wasMoving);
    }
  }

  private upsertRemoteAvatarFromPresence(player: RemotePlayerPresence): void {
    const spriteKey = normalizeSpriteKey(player.spriteKey);
    const facing = normalizeFacing(player.facing);
    const existing = this.remoteAvatars.get(player.userId);

    if (!existing) {
      const runtime = this.createRemoteAvatarRuntime({
        userId: player.userId,
        displayName: player.displayName,
        spriteKey,
        x: player.x,
        y: player.y,
        lastSyncX: player.x,
        lastSyncY: player.y,
        facing,
        moving: player.moving,
      });
      this.remoteAvatars.set(player.userId, runtime);
      return;
    }

    const nameChanged = existing.displayName !== player.displayName;
    existing.displayName = player.displayName;
    existing.spriteKey = spriteKey;

    // Only advance targets from presence sync if presence itself changed coordinates,
    // avoiding snapping back avatars actively driven by realtime move broadcasts.
    if (existing.lastSyncX === null || existing.lastSyncY === null) {
      existing.lastSyncX = player.x;
      existing.lastSyncY = player.y;
    } else if (
      player.x !== existing.lastSyncX ||
      player.y !== existing.lastSyncY
    ) {
      existing.targetX = player.x;
      existing.targetY = player.y;
      existing.lastSyncX = player.x;
      existing.lastSyncY = player.y;
      existing.facing = facing;
      existing.moving = player.moving;
      existing.lastMovePacketAt = this.time?.now ?? 0;
    }

    if (nameChanged) {
      existing.nametagText.setText(
        truncateLabel(player.displayName, NAMETAG_MAX_CHARS),
      );
      this.redrawRemoteNametag(existing);
      this.positionRemoteNametag(existing);
    }
  }

  private handleRemoteMove(packet: AvatarMovePacket): void {
    if (this.cleanedUp) {
      return;
    }
    if (this.localUserId && packet.userId === this.localUserId) {
      return;
    }

    const spriteKey = normalizeSpriteKey(packet.spriteKey);
    const facing = normalizeFacing(packet.facing);
    const existing = this.remoteAvatars.get(packet.userId);

    if (!existing) {
      const runtime = this.createRemoteAvatarRuntime({
        userId: packet.userId,
        displayName: packet.displayName,
        spriteKey,
        x: packet.x,
        y: packet.y,
        lastSyncX: null,
        lastSyncY: null,
        facing,
        moving: packet.moving,
      });
      this.remoteAvatars.set(packet.userId, runtime);
      this.refreshPeerProximity();
      return;
    }

    const nameChanged = existing.displayName !== packet.displayName;
    existing.displayName = packet.displayName;
    existing.spriteKey = spriteKey;
    existing.targetX = packet.x;
    existing.targetY = packet.y;
    existing.facing = facing;
    existing.moving = packet.moving;
    existing.lastMovePacketAt = this.time?.now ?? 0;

    if (nameChanged) {
      existing.nametagText.setText(
        truncateLabel(packet.displayName, NAMETAG_MAX_CHARS),
      );
      this.redrawRemoteNametag(existing);
      this.positionRemoteNametag(existing);
    }
  }

  private createRemoteAvatarRuntime(params: {
    userId: string;
    displayName: string;
    spriteKey: CharacterSpriteKey;
    x: number;
    y: number;
    lastSyncX: number | null;
    lastSyncY: number | null;
    facing: AvatarDirection;
    moving: boolean;
  }): RemoteAvatarRuntime {
    const renderX = Math.round(params.x);
    const renderY = Math.round(params.y);
    const sprite = this.add.sprite(
      renderX,
      renderY,
      `${params.spriteKey}_idle_anim`,
      18,
    );
    sprite.setScale(1);
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(10 + renderY);
    sprite.play(
      `${params.spriteKey}_${params.moving ? 'run' : 'idle_anim'}_${params.facing}`,
      true,
    );

    const nametagBg = this.add.graphics().setDepth(9988);
    const nametagText = this.add
      .text(
        renderX,
        renderY,
        truncateLabel(params.displayName, NAMETAG_MAX_CHARS),
        {
          fontFamily: FONT_STACK,
          fontSize: '11px',
          fontStyle: '600',
          color: '#30343B',
          align: 'center',
          resolution: Math.max(3, window.devicePixelRatio || 2),
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(9989);

    const runtime: RemoteAvatarRuntime = {
      userId: params.userId,
      displayName: params.displayName,
      spriteKey: params.spriteKey,
      sprite,
      x: params.x,
      y: params.y,
      targetX: params.x,
      targetY: params.y,
      lastSyncX: params.lastSyncX,
      lastSyncY: params.lastSyncY,
      facing: params.facing,
      moving: params.moving,
      lastMovePacketAt: this.time?.now ?? 0,
      nametagBg,
      nametagText,
      nametagHeight: 0,
    };

    this.redrawRemoteNametag(runtime);
    this.positionRemoteNametag(runtime, renderX, renderY);
    return runtime;
  }

  private redrawRemoteNametag(runtime: RemoteAvatarRuntime): void {
    const zoom = this.cameras.main.zoom || 3;
    runtime.nametagText.setScale(1 / zoom);

    const padX = 6 / zoom;
    const padY = 2.5 / zoom;
    const boxW = runtime.nametagText.displayWidth + padX * 2;
    const boxH = runtime.nametagText.displayHeight + padY * 2;
    const radius = 4 / zoom;

    runtime.nametagHeight = boxH;
    runtime.nametagBg.clear();
    runtime.nametagBg.fillStyle(0xffffff, 0.96);
    runtime.nametagBg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, radius);
    runtime.nametagBg.lineStyle(1 / zoom, 0x757e74, 1);
    runtime.nametagBg.strokeRoundedRect(
      -boxW / 2,
      -boxH / 2,
      boxW,
      boxH,
      radius,
    );
  }

  private positionRemoteNametag(
    runtime: RemoteAvatarRuntime,
    renderX = Math.round(runtime.x),
    renderY = Math.round(runtime.y),
  ): void {
    const zoom = this.cameras.main.zoom || 3;
    const tagY = renderY + 2 / zoom + runtime.nametagHeight / 2;
    runtime.nametagBg.setPosition(renderX, tagY);
    runtime.nametagText.setPosition(renderX, tagY);
  }

  private removeRemoteAvatar(userId: string): void {
    const existing = this.remoteAvatars.get(userId);
    if (existing) {
      existing.sprite.destroy();
      existing.nametagBg.destroy();
      existing.nametagText.destroy();
      this.remoteAvatars.delete(userId);
    }
    this.removeChatBubble(userId);
  }

  private updateRemoteAvatars(time: number, delta: number): void {
    const dt = Math.min(Math.max(delta, 0), 100) / 1000;
    const alpha = 1 - Math.exp(-REMOTE_LERP_RATE * dt);

    for (const runtime of this.remoteAvatars.values()) {
      runtime.x += (runtime.targetX - runtime.x) * alpha;
      runtime.y += (runtime.targetY - runtime.y) * alpha;
      if (
        Math.hypot(runtime.targetX - runtime.x, runtime.targetY - runtime.y) <
        0.25
      ) {
        runtime.x = runtime.targetX;
        runtime.y = runtime.targetY;
      }

      const renderX = Math.round(runtime.x);
      const renderY = Math.round(runtime.y);
      runtime.sprite.setPosition(renderX, renderY);
      runtime.sprite.setDepth(10 + renderY);

      if (
        runtime.moving &&
        time - runtime.lastMovePacketAt > REMOTE_IDLE_STALE_MS &&
        renderX === Math.round(runtime.targetX) &&
        renderY === Math.round(runtime.targetY)
      ) {
        runtime.moving = false;
      }

      const animKey = `${runtime.spriteKey}_${runtime.moving ? 'run' : 'idle_anim'}_${runtime.facing}`;
      runtime.sprite.play(animKey, true);
      this.positionRemoteNametag(runtime, renderX, renderY);
    }
  }

  private refreshPeerProximity(): void {
    if (!this.player || this.cleanedUp) {
      return;
    }

    const nextPeerIds: string[] = [];
    const nearbyRemotes: RemoteAvatarRuntime[] = [];

    for (const runtime of this.remoteAvatars.values()) {
      const dist = Math.hypot(
        this.player.x - runtime.x,
        this.player.y - runtime.y,
      );
      if (dist <= PEER_PROXIMITY_RADIUS_PX) {
        nextPeerIds.push(runtime.userId);
        nearbyRemotes.push(runtime);
      }
    }

    nextPeerIds.sort();
    if (!areStringArraysEqual(this.nearbyPeerIds, nextPeerIds)) {
      this.nearbyPeerIds = nextPeerIds;
      eventBridge.emit('avatar:proximity-peers', {
        peerIds: [...this.nearbyPeerIds],
      });
    }

    this.proximityRings.clear();
    if (nearbyRemotes.length === 0) {
      return;
    }

    this.drawProximityEllipse(this.player.x, this.player.y);
    for (const remote of nearbyRemotes) {
      this.drawProximityEllipse(remote.x, remote.y);
    }
  }

  private drawProximityEllipse(x: number, y: number): void {
    const cx = Math.round(x);
    const cy = Math.round(y) - 1;
    this.proximityRings.fillStyle(0xc9d7ba, 0.22);
    this.proximityRings.fillEllipse(cx, cy, 20, 8);
    this.proximityRings.lineStyle(1, 0xa4b99c, 1);
    this.proximityRings.strokeEllipse(cx, cy, 20, 8);
  }

  private handleChatBubble(payload: AvatarChatBubblePayload): void {
    if (!this.ready || this.cleanedUp) {
      return;
    }

    const label = truncateLabel(payload.text, CHAT_BUBBLE_MAX_CHARS);
    if (!label) {
      return;
    }

    const targetPos = this.resolveAvatarPosition(payload.userId);
    if (!targetPos) {
      return;
    }

    this.removeChatBubble(payload.userId);

    const bg = this.add.graphics().setDepth(9995);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT_STACK,
        fontSize: '11px',
        fontStyle: '500',
        color: '#30343B',
        align: 'center',
        resolution: 3,
        wordWrap: { width: 170, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(9996);

    const bubble: ChatBubbleRuntime = {
      userId: payload.userId,
      bg,
      text,
      boxHeight: 0,
      expiresAt: (this.time?.now ?? 0) + CHAT_BUBBLE_TTL_MS,
    };

    this.redrawChatBubble(bubble);
    this.positionChatBubble(bubble, targetPos.x, targetPos.y);
    this.chatBubbles.set(payload.userId, bubble);
  }

  private resolveAvatarPosition(
    userId: string,
  ): { x: number; y: number } | null {
    if (this.localUserId && userId === this.localUserId && this.player) {
      return { x: this.player.x, y: this.player.y };
    }
    const remote = this.remoteAvatars.get(userId);
    if (remote) {
      return { x: remote.x, y: remote.y };
    }
    return null;
  }

  private redrawChatBubble(bubble: ChatBubbleRuntime): void {
    const zoom = this.cameras.main.zoom || 3;
    bubble.text.setScale(1 / zoom);

    const padX = 8 / zoom;
    const padY = 4.5 / zoom;
    const boxW = Math.max(20 / zoom, bubble.text.displayWidth + padX * 2);
    const boxH = bubble.text.displayHeight + padY * 2;
    const radius = Math.min(8 / zoom, boxH / 2);

    bubble.boxHeight = boxH;
    bubble.bg.clear();
    bubble.bg.fillStyle(0xffffff, 0.98);
    bubble.bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, radius);
    bubble.bg.lineStyle(1 / zoom, 0x757e74, 1);
    bubble.bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, radius);
  }

  private positionChatBubble(
    bubble: ChatBubbleRuntime,
    avatarX: number,
    avatarY: number,
  ): void {
    const zoom = this.cameras.main.zoom || 3;
    const anchorX = Math.round(avatarX);
    const anchorY = Math.round(avatarY) - 29 - 2 / zoom - bubble.boxHeight / 2;
    bubble.bg.setPosition(anchorX, anchorY);
    bubble.text.setPosition(anchorX, anchorY);
  }

  private removeChatBubble(userId: string): void {
    const existing = this.chatBubbles.get(userId);
    if (!existing) {
      return;
    }
    existing.bg.destroy();
    existing.text.destroy();
    this.chatBubbles.delete(userId);
  }

  private updateChatBubbles(time: number): void {
    for (const [userId, bubble] of [...this.chatBubbles.entries()]) {
      if (time >= bubble.expiresAt) {
        this.removeChatBubble(userId);
        continue;
      }
      const pos = this.resolveAvatarPosition(userId);
      if (!pos) {
        this.removeChatBubble(userId);
        continue;
      }
      this.positionChatBubble(bubble, pos.x, pos.y);
    }
  }

  private updateChatBubblesPosition(): void {
    for (const [userId, bubble] of this.chatBubbles.entries()) {
      const pos = this.resolveAvatarPosition(userId);
      if (pos) {
        this.positionChatBubble(bubble, pos.x, pos.y);
      }
    }
  }

  private triggerInteraction(target: InteractableRuntime): void {
    eventBridge.emit('workstation:interact', {
      workstationId: target.workstationId,
      label: target.label,
    });
  }

  private refreshProximity(time: number): void {
    const px = this.player.x;
    const py = this.player.y - TILE_SIZE * 0.4;
    let closest: InteractableRuntime | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.centerX, py - item.centerY);
      if (dist <= item.radiusPx && dist < bestDist) {
        bestDist = dist;
        closest = item;
      }
    }

    const prevId = this.nearby?.workstationId ?? null;
    const nextId = closest?.workstationId ?? null;
    if (prevId !== nextId) {
      this.nearby = closest;
      if (closest) {
        eventBridge.emit('workstation:proximity', {
          workstationId: closest.workstationId,
          label: closest.label,
        });
      } else {
        eventBridge.emit('workstation:proximity', { workstationId: null });
      }
    }

    this.promptMarker.clear();
    if (closest) {
      const reduceMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const bob = reduceMotion ? 0 : Math.round(Math.sin(time * 0.006) * 2);
      const mx = Math.round(closest.centerX);
      const my = Math.round(closest.sprite.y - 6 + bob);
      const radius = 3;
      this.promptMarker.fillStyle(0x4a6b46, 1);
      this.promptMarker.fillCircle(mx, my, radius);
      this.promptMarker.lineStyle(1, 0xffffff, 1);
      this.promptMarker.strokeCircle(mx, my, radius);
    }
  }

  private getFilterModes(): Record<string, number> {
    const modes: Record<string, number> = {};
    for (const key of TEXTURE_KEYS) {
      if (this.textures.exists(key)) {
        const tex = this.textures.get(key);
        modes[key] =
          tex.source[0]?.scaleMode ?? Phaser.Textures.FilterMode.LINEAR;
      }
    }
    return modes;
  }

  private installDebugApi(): void {
    const api: LearnNexusGameApi = {
      getState: () => ({
        ready: this.ready,
        tileSize: TILE_SIZE,
        cameraZoom: this.cameras.main.zoom,
        roundPixels: this.cameras.main.roundPixels,
        pixelArt: this.game.config.pixelArt,
        antialias: this.game.config.antialias,
        filterModes: this.getFilterModes(),
        playerTileX: Number((this.player.x / TILE_SIZE).toFixed(2)),
        playerTileY: Number((this.player.y / TILE_SIZE).toFixed(2)),
        facing: this.facing,
        activeAnim: this.player.anims.currentAnim?.key ?? 'none',
        nearbyWorkstation: this.nearby?.workstationId ?? null,
        panelOpen: this.panelOpen,
        canvasWidth: this.game.canvas.width,
        canvasHeight: this.game.canvas.height,
        dpr: window.devicePixelRatio || 1,
        localSpriteKey: this.localSpriteKey,
        remotePlayerCount: this.remoteAvatars.size,
        remotePlayerIds: Array.from(this.remoteAvatars.keys()).sort(),
        nearbyPeerIds: [...this.nearbyPeerIds],
        activeChatBubbleCount: this.chatBubbles.size,
      }),
      teleportToWorkstation: (workstationId: WorkstationId) => {
        if (!this.ready || this.cleanedUp) {
          return false;
        }
        const target = TELEPORT_TARGETS[workstationId];
        if (!target) {
          return false;
        }
        const px = Math.round(target.x * TILE_SIZE);
        const py = Math.round(target.y * TILE_SIZE);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.reset(px, py);
        body.setVelocity(0, 0);

        this.facing = 'up';
        this.wasMoving = false;
        this.player.play(`${this.localSpriteKey}_idle_anim_up`, true);
        this.player.setDepth(10 + this.player.y);
        this.refreshProximity(this.time.now);
        this.refreshPeerProximity();
        this.emitLocalMove(false, this.time.now);
        return true;
      },
    };

    this.debugApi = api;
    window.__LEARNNEXUS_GAME__ = api;
  }

  private registerLifecycleCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.game.events.once('campus:dispose', this.cleanup, this);
  }

  private readonly cleanup = (): void => {
    if (this.cleanedUp) {
      return;
    }
    this.cleanedUp = true;
    this.ready = false;

    this.scale.off('resize', this.handleResize, this);
    this.input.keyboard?.off('keydown-E', this.handleKeyDownE, this);
    this.game.events.off('campus:dispose', this.cleanup, this);

    for (const unsub of this.bridgeUnsubs) {
      unsub();
    }
    this.bridgeUnsubs = [];

    for (const runtime of this.remoteAvatars.values()) {
      runtime.sprite.destroy();
      runtime.nametagBg.destroy();
      runtime.nametagText.destroy();
    }
    this.remoteAvatars.clear();

    for (const bubble of this.chatBubbles.values()) {
      bubble.bg.destroy();
      bubble.text.destroy();
    }
    this.chatBubbles.clear();

    this.proximityRings?.destroy();
    this.promptMarker?.destroy();

    this.nearbyPeerIds = [];
    this.externalInputFocused = false;
    this.wasMoving = false;
    this.lastMoveEmitAt = 0;

    for (const item of this.interactables) {
      item.sprite.off('pointerdown');
    }
    this.interactables = [];
    this.nearby = null;

    if (this.debugApi && window.__LEARNNEXUS_GAME__ === this.debugApi) {
      delete window.__LEARNNEXUS_GAME__;
    }
    this.debugApi = undefined;
  };
}
