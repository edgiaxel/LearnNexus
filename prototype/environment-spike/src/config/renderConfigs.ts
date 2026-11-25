export type RenderModeId = 'config-a-16px' | 'config-b-48px';
export type ViewModeId = 'follow' | 'full';

export interface RenderConfig {
  id: RenderModeId;
  label: string;
  shortLabel: string;
  tileSize: 16 | 48;
  cameraZoom: 3 | 1;
  characterScale: 1 | 3;
  tilesetKey: string;
  tilesetUrl: string;
  atlasKey: string;
  atlasPngUrl: string;
  atlasJsonUrl: string;
  atlasFramePrefix: string;
  description: string;
}

export const RENDER_CONFIGS: Record<RenderModeId, RenderConfig> = {
  'config-a-16px': {
    id: 'config-a-16px',
    label: 'Config A: 16px Native Tiles + 3x Camera Zoom',
    shortLabel: 'Config A (16px @ 3x)',
    tileSize: 16,
    cameraZoom: 3,
    characterScale: 1,
    tilesetKey: 'room_builder_16',
    tilesetUrl: '/processed-assets/phaser/tilesets/Room_Builder_free_16x16.png',
    atlasKey: 'interiors_16',
    atlasPngUrl: '/processed-assets/phaser/atlases/interiors_16x16.png',
    atlasJsonUrl: '/processed-assets/phaser/atlases/interiors_16x16.json',
    atlasFramePrefix: 'int16_obj_',
    description:
      'Native 16x16 tiles and 16x32 Adam sprite rendered at 1:1 asset scale with integer 3x camera zoom.',
  },
  'config-b-48px': {
    id: 'config-b-48px',
    label: 'Config B: 48px Upscaled Tiles + 3x Scaled Character (1x Zoom)',
    shortLabel: 'Config B (48px @ 1x)',
    tileSize: 48,
    cameraZoom: 1,
    characterScale: 3,
    tilesetKey: 'room_builder_48',
    tilesetUrl: '/processed-assets/phaser/tilesets/Room_Builder_free_48x48.png',
    atlasKey: 'interiors_48',
    atlasPngUrl: '/processed-assets/phaser/atlases/interiors_48x48.png',
    atlasJsonUrl: '/processed-assets/phaser/atlases/interiors_48x48.json',
    atlasFramePrefix: 'int48_obj_',
    description:
      '48x48 tileset and atlas with 16x32 Adam sprite scaled 3x via NEAREST filtering at 1x camera zoom.',
  },
};

export const VIEWPORT_DIMENSIONS: Record<ViewModeId, { width: number; height: number }> = {
  // 20x12 visible tiles at 48px display size (integer 3x for 16px, 1x for 48px)
  follow: { width: 960, height: 576 },
  // Full 24x16 map at exact 48px display size (zero fractional scaling)
  full: { width: 1152, height: 768 },
};
