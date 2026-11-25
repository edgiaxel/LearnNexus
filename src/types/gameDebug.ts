import type { WorkstationId } from './contracts';

export type AvatarDirection = 'right' | 'up' | 'left' | 'down';

export interface LearnNexusGameState {
  ready: boolean;
  tileSize: number;
  cameraZoom: number;
  roundPixels: boolean;
  pixelArt: boolean;
  antialias: boolean;
  filterModes: Record<string, number>;
  playerTileX: number;
  playerTileY: number;
  facing: AvatarDirection;
  activeAnim: string;
  nearbyWorkstation: WorkstationId | null;
  panelOpen: boolean;
  canvasWidth: number;
  canvasHeight: number;
  dpr: number;
}

export interface LearnNexusGameApi {
  getState: () => LearnNexusGameState;
  teleportToWorkstation: (workstationId: WorkstationId) => boolean;
}

declare global {
  interface Window {
    __LEARNNEXUS_GAME__?: LearnNexusGameApi;
  }
}
