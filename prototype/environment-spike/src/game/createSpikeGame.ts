import Phaser from 'phaser';
import {
  VIEWPORT_DIMENSIONS,
  type RenderConfig,
  type ViewModeId,
} from '../config/renderConfigs';
import { PrototypeScene } from './PrototypeScene';

export function createSpikeGame(
  parent: HTMLElement,
  config: RenderConfig,
  viewMode: ViewModeId,
): Phaser.Game {
  const { width, height } = VIEWPORT_DIMENSIONS[viewMode];
  const scene = new PrototypeScene(config, viewMode);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#F7F4EC',
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [scene],
  });

  return game;
}
