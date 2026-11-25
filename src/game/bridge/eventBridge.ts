import type {
  BridgeEventName,
  BridgeEvents,
  BridgeHandler,
} from '../../types/contracts';

type AnyHandler = (payload: unknown) => void;

class TypedEventBridge {
  private readonly listeners = new Map<BridgeEventName, Set<AnyHandler>>();

  on<K extends BridgeEventName>(
    event: K,
    handler: BridgeHandler<K>,
  ): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    const fn = handler as AnyHandler;
    bucket.add(fn);
    return () => {
      this.off(event, handler);
    };
  }

  off<K extends BridgeEventName>(event: K, handler: BridgeHandler<K>): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    bucket.delete(handler as AnyHandler);
    if (bucket.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends BridgeEventName>(event: K, payload: BridgeEvents[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    // Iterate a snapshot so handlers that unsubscribe during emit remain safe.
    for (const handler of [...bucket]) {
      (handler as BridgeHandler<K>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBridge = new TypedEventBridge();
