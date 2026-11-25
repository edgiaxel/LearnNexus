export type Direction = 'right' | 'up' | 'left' | 'down';

export interface InteractionPayload {
  objectId: string;
  label: string;
  category: string;
  summary: string;
  notes: string;
  tileX: number;
  tileY: number;
}

export interface SpikeMetrics {
  modeId: string;
  tileSize: number;
  cameraZoom: number;
  characterScale: number;
  fps: number;
  playerTileX: number;
  playerTileY: number;
  playerPixelX: number;
  playerPixelY: number;
  facing: Direction;
  isMoving: boolean;
  activeAnim: string;
  debugEnabled: boolean;
}

type EventMap = {
  'proximity:change': InteractionPayload | null;
  'object:interact': InteractionPayload;
  'panel:closed': void;
  'metrics:update': SpikeMetrics;
  'debug:changed': boolean;
};

type Listener<T> = (payload: T) => void;

class SpikeBridge {
  private listeners = new Map<keyof EventMap, Set<Listener<never>>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => {
      set?.delete(fn as Listener<never>);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as Listener<EventMap[K]>)(payload);
    }
  }
}

export const spikeBridge = new SpikeBridge();
