import { useEffect, useRef } from 'react';
import type { WorkstationId } from '../types/contracts';
import { eventBridge } from './bridge/eventBridge';
import { createGame } from './createGame';

export interface PhaserHostProps {
  className?: string;
  activeWorkstation?: WorkstationId | null;
  onReady?: () => void;
}

export function PhaserHost({
  className,
  activeWorkstation,
  onReady,
}: PhaserHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    // Remove any leftover canvas from a prior React StrictMode mount pass.
    container.replaceChildren();

    const game = createGame(container);

    const handleReady = () => {
      if (!disposed) {
        onReadyRef.current?.();
      }
    };
    game.events.once('campus:ready', handleReady);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        if (disposed) return;
        const rect = entries[0]?.contentRect;
        if (!rect) return;
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        if (
          width > 0 &&
          height > 0 &&
          (Math.floor(game.scale.width) !== width ||
            Math.floor(game.scale.height) !== height)
        ) {
          game.scale.resize(width, height);
        }
      });
      observer.observe(container);
    }

    const unsubPanelClosed = eventBridge.on('panel:closed', () => {
      if (!disposed) {
        containerRef.current?.focus({ preventScroll: true });
      }
    });

    return () => {
      disposed = true;
      unsubPanelClosed();
      observer?.disconnect();
      game.events.off('campus:ready', handleReady);
      game.events.emit('campus:dispose');
      game.destroy(true);
      container.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="phaser-canvas-container"
      data-active-workstation={activeWorkstation ?? ''}
      tabIndex={0}
      role="region"
      aria-label="LearnNexus 2D Campus Studio"
      className={className}
    />
  );
}
