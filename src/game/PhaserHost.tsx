import { useEffect, useRef } from 'react';
import type { CharacterSpriteKey, WorkstationId } from '../types/contracts';
import { eventBridge } from './bridge/eventBridge';
import { createGame } from './createGame';

export interface LocalAvatarIdentity {
  userId: string;
  displayName: string;
  spriteKey: CharacterSpriteKey;
}

export interface PhaserHostProps {
  className?: string;
  activeWorkstation?: WorkstationId | null;
  localIdentity?: LocalAvatarIdentity;
  onReady?: () => void;
}

export function PhaserHost({
  className,
  activeWorkstation,
  localIdentity,
  onReady,
}: PhaserHostProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const localIdentityRef = useRef(localIdentity);
  localIdentityRef.current = localIdentity;
  const sceneReadyRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    sceneReadyRef.current = false;
    // Remove any leftover canvas from a prior React StrictMode mount pass.
    container.replaceChildren();

    const game = createGame(container);

    const handleReady = () => {
      if (!disposed) {
        sceneReadyRef.current = true;
        if (localIdentityRef.current) {
          eventBridge.emit('avatar:local-identity', localIdentityRef.current);
        }
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
      sceneReadyRef.current = false;
      unsubPanelClosed();
      observer?.disconnect();
      game.events.off('campus:ready', handleReady);
      game.events.emit('campus:dispose');
      game.destroy(true);
      container.replaceChildren();
    };
  }, []);

  const identityUserId = localIdentity?.userId;
  const identityDisplayName = localIdentity?.displayName;
  const identitySpriteKey = localIdentity?.spriteKey;

  useEffect(() => {
    if (
      !sceneReadyRef.current ||
      identityUserId === undefined ||
      identityDisplayName === undefined ||
      identitySpriteKey === undefined
    ) {
      return;
    }
    eventBridge.emit('avatar:local-identity', {
      userId: identityUserId,
      displayName: identityDisplayName,
      spriteKey: identitySpriteKey,
    });
  }, [identityUserId, identityDisplayName, identitySpriteKey]);

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
