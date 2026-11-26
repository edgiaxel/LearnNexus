import type {
  AvatarFacing,
  CharacterSpriteKey,
  WorkstationId,
} from './contracts';

export type AvatarDirection = AvatarFacing;

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
  localSpriteKey: CharacterSpriteKey;
  remotePlayerCount: number;
  remotePlayerIds: string[];
  nearbyPeerIds: string[];
  activeChatBubbleCount: number;
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
