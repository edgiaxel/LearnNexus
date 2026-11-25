import { useEffect, useRef } from 'react';
import type { WorkstationId } from '../types/contracts';

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

  useEffect(() => {
    onReady?.();
  }, [onReady]);

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
