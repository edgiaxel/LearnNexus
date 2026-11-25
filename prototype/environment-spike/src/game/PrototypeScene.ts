import Phaser from 'phaser';
import mapData from '../maps/campusStudioMap.json';
import type { RenderConfig, ViewModeId } from '../config/renderConfigs';
import { spikeBridge, type Direction, type InteractionPayload } from './spikeBridge';

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
  spec: MapObjectSpec;
  sprite: Phaser.GameObjects.Image;
  centerX: number;
  centerY: number;
  radiusPx: number;
  payload: InteractionPayload;
}

export interface SpikeDebugApi {
  getState: () => {
    modeId: string;
    viewMode: ViewModeId;
    tileSize: number;
    cameraZoom: number;
    characterScale: number;
    playerX: number;
    playerY: number;
    playerTileX: number;
    playerTileY: number;
    facing: Direction;
    activeAnim: string;
    fps: number;
    debugEnabled: boolean;
    nearbyObjectId: string | null;
    panelOpen: boolean;
    canvasWidth: number;
    canvasHeight: number;
  };
  setDebug: (enabled: boolean) => void;
  teleportTile: (tileX: number, tileY: number, facing?: Direction) => void;
  stepMove: (dir: Direction, durationMs: number) => Promise<{ startX: number; startY: number; endX: number; endY: number }>;
  openNearby: () => boolean;
  closePanel: () => void;
}

declare global {
  interface Window {
    __SPIKE__?: SpikeDebugApi;
  }
}

export class PrototypeScene extends Phaser.Scene {
  private readonly cfg: RenderConfig;
  private readonly viewMode: ViewModeId;

  private player!: Phaser.Physics.Arcade.Sprite;
  private colliders!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: InteractableRuntime[] = [];
  private nearby: InteractableRuntime | null = null;
  private promptMarker!: Phaser.GameObjects.Graphics;
  private debugGraphics!: Phaser.GameObjects.Graphics;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyC!: Phaser.Input.Keyboard.Key;

  private facing: Direction = 'down';
  private panelOpen = false;
  private debugEnabled = false;
  private unsubPanelClosed?: () => void;
  private unsubDebug?: () => void;
  private lastMetricsEmit = 0;

  private forcedMove: { dir: Direction } | null = null;

  constructor(cfg: RenderConfig, viewMode: ViewModeId) {
    super({ key: 'PrototypeScene' });
    this.cfg = cfg;
    this.viewMode = viewMode;
  }

  preload(): void {
    this.load.image(this.cfg.tilesetKey, this.cfg.tilesetUrl);
    this.load.atlas(this.cfg.atlasKey, this.cfg.atlasPngUrl, this.cfg.atlasJsonUrl);

    this.load.spritesheet('adam_idle', '/processed-assets/phaser/characters/Adam_idle_16x16.png', {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet('adam_idle_anim', '/processed-assets/phaser/characters/Adam_idle_anim_16x16.png', {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet('adam_run', '/processed-assets/phaser/characters/Adam_run_16x16.png', {
      frameWidth: 16,
      frameHeight: 32,
    });
  }

  create(): void {
    const tSize = this.cfg.tileSize;
    const worldW = mapData.width * tSize;
    const worldH = mapData.height * tSize;

    // Enforce ADR-012 nearest-neighbor texture filtering on every loaded texture
    for (const key of [this.cfg.tilesetKey, this.cfg.atlasKey, 'adam_idle', 'adam_idle_anim', 'adam_run']) {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);

    // 1. Tilemap layers from external campusStudioMap.json
    const floorMap = this.make.tilemap({ data: mapData.layers.floor, tileWidth: tSize, tileHeight: tSize });
    const floorTileset = floorMap.addTilesetImage(this.cfg.tilesetKey, this.cfg.tilesetKey, tSize, tSize, 0, 0);
    if (floorTileset) {
      floorMap.createLayer(0, floorTileset, 0, 0)?.setDepth(0);
    }

    const wallMap = this.make.tilemap({ data: mapData.layers.walls, tileWidth: tSize, tileHeight: tSize });
    const wallTileset = wallMap.addTilesetImage(this.cfg.tilesetKey, this.cfg.tilesetKey, tSize, tSize, 0, 0);
    if (wallTileset) {
      wallMap.createLayer(0, wallTileset, 0, 0)?.setDepth(1);
    }

    const borderMap = this.make.tilemap({ data: mapData.layers.borders, tileWidth: tSize, tileHeight: tSize });
    const borderTileset = borderMap.addTilesetImage(this.cfg.tilesetKey, this.cfg.tilesetKey, tSize, tSize, 0, 0);
    if (borderTileset) {
      borderMap.createLayer(0, borderTileset, 0, 0)?.setDepth(2);
    }

    // 2. Static collision bodies for solid tiles
    this.colliders = this.physics.add.staticGroup();
    for (let r = 0; r < mapData.height; r++) {
      for (let c = 0; c < mapData.width; c++) {
        if (mapData.layers.collision[r][c] === 1) {
          const zone = this.add.zone(c * tSize + tSize / 2, r * tSize + tSize / 2, tSize, tSize);
          this.physics.add.existing(zone, true);
          this.colliders.add(zone);
        }
      }
    }

    // 3. Place objects from map data
    this.interactables = [];
    for (const obj of mapData.objects as MapObjectSpec[]) {
      const frameName = `${this.cfg.atlasFramePrefix}${obj.spriteNum}`;
      const px = Math.round(obj.tileX * tSize);
      const py = Math.round(obj.tileY * tSize);
      const img = this.add.image(px, py, this.cfg.atlasKey, frameName).setOrigin(0, 0);

      if (obj.layer === 'floor_decor') {
        img.setDepth(3);
      } else if (obj.layer === 'wall_decor') {
        img.setDepth(4);
      } else {
        // Y-sorted furniture depth based on sprite bottom
        img.setDepth(10 + py + img.height);
      }

      if (obj.collidable && obj.collider) {
        const cw = Math.max(4, Math.round(obj.collider.widthTiles * tSize));
        const ch = Math.max(4, Math.round(obj.collider.heightTiles * tSize));
        const cx = Math.round(px + obj.collider.offsetX * tSize + cw / 2);
        const cy = Math.round(py + obj.collider.offsetY * tSize + ch / 2);
        const cZone = this.add.zone(cx, cy, cw, ch);
        this.physics.add.existing(cZone, true);
        this.colliders.add(cZone);
      }

      if (obj.interaction) {
        const centerX = px + img.width / 2;
        const centerY = py + img.height / 2;
        const payload: InteractionPayload = {
          objectId: obj.interaction.objectId,
          label: obj.interaction.label,
          category: obj.interaction.category,
          summary: obj.interaction.summary,
          notes: obj.interaction.notes,
          tileX: obj.tileX,
          tileY: obj.tileY,
        };
        const runtime: InteractableRuntime = {
          spec: obj,
          sprite: img,
          centerX,
          centerY,
          radiusPx: obj.interaction.radiusTiles * tSize,
          payload,
        };
        this.interactables.push(runtime);

        img.setInteractive({ useHandCursor: true });
        img.on('pointerdown', () => {
          if (this.nearby?.spec.id === obj.id && !this.panelOpen) {
            this.triggerInteraction(runtime);
          }
        });
      }
    }

    // 4. Character (Adam) + Animations
    this.registerCharacterAnimations();
    const spawnX = Math.round(mapData.spawn.tileX * tSize);
    const spawnY = Math.round(mapData.spawn.tileY * tSize);
    this.facing = (mapData.spawn.facing as Direction) || 'down';

    this.player = this.physics.add.sprite(spawnX, spawnY, 'adam_idle_anim', 18);
    this.player.setScale(this.cfg.characterScale);
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);

    // Compact foot collider (in unscaled 16x32 local space, Phaser scales body with sprite scale)
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6);
    body.setOffset(3, 25);

    this.physics.add.collider(this.player, this.colliders);
    this.player.play(`adam_idle_anim_${this.facing}`);

    // 5. Camera setup (integer zoom, rounded pixels)
    const cam = this.cameras.main;
    cam.setZoom(this.cfg.cameraZoom);
    cam.setRoundPixels(true);
    cam.setBounds(0, 0, worldW, worldH);
    if (this.viewMode === 'follow') {
      cam.startFollow(this.player, true, 1, 1);
    } else {
      cam.centerOn(worldW / 2, worldH / 2);
    }

    // 6. Indicators & Debug graphics
    this.promptMarker = this.add.graphics().setDepth(9990);
    this.debugGraphics = this.add.graphics().setDepth(9995);

    // 7. Input setup
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    this.unsubPanelClosed = spikeBridge.on('panel:closed', () => {
      this.panelOpen = false;
      if (this.input.keyboard) {
        this.input.keyboard.enabled = true;
      }
    });

    this.unsubDebug = spikeBridge.on('debug:changed', (enabled) => {
      this.debugEnabled = enabled;
      if (!enabled) {
        this.debugGraphics.clear();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubPanelClosed?.();
      this.unsubDebug?.();
      if (window.__SPIKE__) {
        delete window.__SPIKE__;
      }
    });

    this.installDebugApi();
  }

  private registerCharacterAnimations(): void {
    const dirs: Array<{ dir: Direction; start: number; end: number }> = [
      { dir: 'right', start: 0, end: 5 },
      { dir: 'up', start: 6, end: 11 },
      { dir: 'left', start: 12, end: 17 },
      { dir: 'down', start: 18, end: 23 },
    ];

    for (const { dir, start, end } of dirs) {
      const idleKey = `adam_idle_anim_${dir}`;
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: this.anims.generateFrameNumbers('adam_idle_anim', { start, end }),
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

  update(time: number): void {
    const tSize = this.cfg.tileSize;
    const speed = 4.2 * tSize;

    if (this.keyC && Phaser.Input.Keyboard.JustDown(this.keyC) && !this.panelOpen) {
      this.debugEnabled = !this.debugEnabled;
      spikeBridge.emit('debug:changed', this.debugEnabled);
      if (!this.debugEnabled) {
        this.debugGraphics.clear();
      }
    }

    let vx = 0;
    let vy = 0;
    if (!this.panelOpen) {
      if (this.forcedMove) {
        if (this.forcedMove.dir === 'left') vx = -1;
        if (this.forcedMove.dir === 'right') vx = 1;
        if (this.forcedMove.dir === 'up') vy = -1;
        if (this.forcedMove.dir === 'down') vy = 1;
      } else if (this.cursors && this.wasd) {
        if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
      }
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (vx !== 0 || vy !== 0) {
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

    // Y-depth sort player cleanly against furniture
    this.player.setDepth(10 + this.player.y);

    // Proximity interaction detection
    this.updateProximity(time);

    if (this.keyE && Phaser.Input.Keyboard.JustDown(this.keyE) && this.nearby && !this.panelOpen) {
      this.triggerInteraction(this.nearby);
    }

    if (this.debugEnabled) {
      this.drawDebugOverlay();
    }

    if (time - this.lastMetricsEmit > 150) {
      this.lastMetricsEmit = time;
      spikeBridge.emit('metrics:update', {
        modeId: this.cfg.id,
        tileSize: tSize,
        cameraZoom: this.cfg.cameraZoom,
        characterScale: this.cfg.characterScale,
        fps: Math.round(this.game.loop.actualFps || 60),
        playerTileX: Number((this.player.x / tSize).toFixed(2)),
        playerTileY: Number((this.player.y / tSize).toFixed(2)),
        playerPixelX: Math.round(this.player.x),
        playerPixelY: Math.round(this.player.y),
        facing: this.facing,
        isMoving: vx !== 0 || vy !== 0,
        activeAnim: this.player.anims.currentAnim?.key ?? 'none',
        debugEnabled: this.debugEnabled,
      });
    }
  }

  private updateProximity(time: number): void {
    const px = this.player.x;
    const py = this.player.y - this.cfg.tileSize * 0.4;
    let closest: InteractableRuntime | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const item of this.interactables) {
      const dist = Math.hypot(px - item.centerX, py - item.centerY);
      if (dist <= item.radiusPx && dist < bestDist) {
        bestDist = dist;
        closest = item;
      }
    }

    if (closest?.spec.id !== this.nearby?.spec.id) {
      this.nearby = closest;
      spikeBridge.emit('proximity:change', closest ? closest.payload : null);
    }

    this.promptMarker.clear();
    if (closest) {
      const bob = Math.round(Math.sin(time * 0.006) * 2);
      const mx = Math.round(closest.centerX);
      const my = Math.round(closest.sprite.y - 6 + bob);
      const r = this.cfg.tileSize >= 48 ? 6 : 3;
      this.promptMarker.fillStyle(0x4a6b46, 1);
      this.promptMarker.fillCircle(mx, my, r);
      this.promptMarker.lineStyle(1, 0xffffff, 1);
      this.promptMarker.strokeCircle(mx, my, r);
    }
  }

  private triggerInteraction(target: InteractableRuntime): void {
    this.panelOpen = true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false;
    }
    spikeBridge.emit('object:interact', target.payload);
  }

  private drawDebugOverlay(): void {
    const g = this.debugGraphics;
    g.clear();

    // Static colliders (red)
    g.lineStyle(1, 0xd64545, 0.9);
    g.fillStyle(0xd64545, 0.16);
    for (const child of this.colliders.getChildren()) {
      const b = child.body as Phaser.Physics.Arcade.StaticBody;
      g.fillRect(b.x, b.y, b.width, b.height);
      g.strokeRect(b.x, b.y, b.width, b.height);
    }

    // Player foot hitbox (green)
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    g.lineStyle(1, 0x2f855a, 1);
    g.fillStyle(0x48bb78, 0.35);
    g.fillRect(pb.x, pb.y, pb.width, pb.height);
    g.strokeRect(pb.x, pb.y, pb.width, pb.height);

    // Interaction radii (blue dashed/solid circles)
    g.lineStyle(1, 0x3b82f6, 0.75);
    for (const item of this.interactables) {
      g.strokeCircle(item.centerX, item.centerY, item.radiusPx);
    }
  }

  private installDebugApi(): void {
    const tSize = this.cfg.tileSize;
    window.__SPIKE__ = {
      getState: () => ({
        modeId: this.cfg.id,
        viewMode: this.viewMode,
        tileSize: tSize,
        cameraZoom: this.cfg.cameraZoom,
        characterScale: this.cfg.characterScale,
        playerX: Math.round(this.player.x),
        playerY: Math.round(this.player.y),
        playerTileX: Number((this.player.x / tSize).toFixed(2)),
        playerTileY: Number((this.player.y / tSize).toFixed(2)),
        facing: this.facing,
        activeAnim: this.player.anims.currentAnim?.key ?? 'none',
        fps: Math.round(this.game.loop.actualFps || 60),
        debugEnabled: this.debugEnabled,
        nearbyObjectId: this.nearby?.payload.objectId ?? null,
        panelOpen: this.panelOpen,
        canvasWidth: this.game.canvas.width,
        canvasHeight: this.game.canvas.height,
      }),
      setDebug: (enabled: boolean) => {
        this.debugEnabled = enabled;
        spikeBridge.emit('debug:changed', enabled);
        if (!enabled) this.debugGraphics.clear();
      },
      teleportTile: (tileX: number, tileY: number, facing?: Direction) => {
        this.player.setPosition(Math.round(tileX * tSize), Math.round(tileY * tSize));
        if (facing) {
          this.facing = facing;
          this.player.play(`adam_idle_anim_${facing}`, true);
        }
      },
      stepMove: (dir: Direction, durationMs: number) =>
        new Promise((resolve) => {
          const startX = Math.round(this.player.x);
          const startY = Math.round(this.player.y);
          this.forcedMove = { dir };
          setTimeout(() => {
            this.forcedMove = null;
            resolve({
              startX,
              startY,
              endX: Math.round(this.player.x),
              endY: Math.round(this.player.y),
            });
          }, durationMs);
        }),
      openNearby: () => {
        if (!this.nearby) return false;
        this.triggerInteraction(this.nearby);
        return true;
      },
      closePanel: () => {
        spikeBridge.emit('panel:closed', undefined);
      },
    };
  }
}
