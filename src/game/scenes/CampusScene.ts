import Phaser from 'phaser';
import { WORKSTATION_META } from '../../app/routerContract';
import type { WorkstationId } from '../../types/contracts';
import type { AvatarDirection, LearnNexusGameApi } from '../../types/gameDebug';
import { eventBridge } from '../bridge/eventBridge';
import mapData from '../maps/campusStudioMap.json';

const TILE_SIZE = 16;
const MOVE_SPEED_TILES_PER_SEC = 4.2;
const MOBILE_BREAKPOINT_PX = 640;

const TEXTURE_KEYS = [
  'room_builder_16',
  'interiors_16',
  'adam_idle',
  'adam_idle_anim',
  'adam_run',
] as const;

const WORKSTATION_ID_MAP: Record<string, WorkstationId | undefined> = {
  'workstation-overview': 'overview',
  'meeting-table': 'tasks',
  'resource-shelf': 'resources',
};

const TELEPORT_TARGETS: Record<WorkstationId, { x: number; y: number }> = {
  overview: { x: 2.8, y: 6.5 },
  tasks: { x: 11.25, y: 9.1 },
  resources: { x: 19.5, y: 4.9 },
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

export class CampusScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: InteractableRuntime[] = [];
  private nearby: InteractableRuntime | null = null;
  private promptMarker!: Phaser.GameObjects.Graphics;

  private cursors: MovementCursors | null = null;
  private wasd: WasdKeys | null = null;

  private facing: AvatarDirection = 'down';
  private panelOpen = false;
  private ready = false;
  private cleanedUp = false;
  private worldW = mapData.width * TILE_SIZE;
  private worldH = mapData.height * TILE_SIZE;

  private unsubInteract?: () => void;
  private unsubPanelClosed?: () => void;
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
    this.load.spritesheet(
      'adam_idle_anim',
      '/assets/characters/Adam_idle_anim_16x16.png',
      { frameWidth: 16, frameHeight: 32 },
    );
    this.load.spritesheet(
      'adam_run',
      '/assets/characters/Adam_run_16x16.png',
      { frameWidth: 16, frameHeight: 32 },
    );
  }

  create(): void {
    this.cleanedUp = false;
    this.panelOpen = false;
    this.nearby = null;
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
    this.game.events.emit('campus:ready');
  }

  update(time: number): void {
    if (!this.ready || this.cleanedUp) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    if (!this.panelOpen && !isTextInputFocused() && this.cursors && this.wasd) {
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
      this.player.play(`adam_run_${this.facing}`, true);
    } else {
      body.setVelocity(0, 0);
      this.player.play(`adam_idle_anim_${this.facing}`, true);
    }

    this.player.setDepth(10 + this.player.y);
    this.refreshProximity(time);
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
      'adam_idle_anim',
      18,
    );
    this.player.setScale(1);
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6);
    body.setOffset(3, 25);

    this.physics.add.collider(this.player, this.colliders);
    this.player.play(`adam_idle_anim_${this.facing}`);
    this.player.setDepth(10 + this.player.y);
  }

  private registerCharacterAnimations(): void {
    const directions: Array<{ dir: AvatarDirection; start: number; end: number }> = [
      { dir: 'right', start: 0, end: 5 },
      { dir: 'up', start: 6, end: 11 },
      { dir: 'left', start: 12, end: 17 },
      { dir: 'down', start: 18, end: 23 },
    ];

    for (const { dir, start, end } of directions) {
      const idleKey = `adam_idle_anim_${dir}`;
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: this.anims.generateFrameNumbers('adam_idle_anim', {
            start,
            end,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }

      const runKey = `adam_run_${dir}`;
      if (!this.anims.exists(runKey)) {
        this.anims.create({
          key: runKey,
          frames: this.anims.generateFrameNumbers('adam_run', { start, end }),
          frameRate: 10,
          repeat: -1,
        });
      }
    }
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    this.applyCameraLayout(gameSize.width, gameSize.height);
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
    if (event.repeat || this.panelOpen || !this.nearby || isTextInputFocused()) {
      return;
    }
    this.triggerInteraction(this.nearby);
  };

  private subscribeBridgeEvents(): void {
    this.unsubInteract = eventBridge.on('workstation:interact', () => {
      this.enterPanelOpenState();
    });

    this.unsubPanelClosed = eventBridge.on('panel:closed', () => {
      this.panelOpen = false;
      if (this.input.keyboard) {
        this.input.keyboard.enabled = true;
        this.input.keyboard.enableGlobalCapture();
        this.input.keyboard.resetKeys();
      }
    });
  }

  private enterPanelOpenState(): void {
    this.panelOpen = true;
    const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setVelocity(0, 0);
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
      this.input.keyboard.disableGlobalCapture();
      this.input.keyboard.resetKeys();
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
        this.player.play('adam_idle_anim_up', true);
        this.player.setDepth(10 + this.player.y);
        this.refreshProximity(this.time.now);
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

    this.unsubInteract?.();
    this.unsubInteract = undefined;
    this.unsubPanelClosed?.();
    this.unsubPanelClosed = undefined;

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
