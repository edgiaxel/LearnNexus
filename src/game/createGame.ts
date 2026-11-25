import Phaser from 'phaser';
import { CampusScene } from './scenes/CampusScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const width = Math.max(320, Math.floor(parent.clientWidth) || 960);
  const height = Math.max(240, Math.floor(parent.clientHeight) || 576);

  return new Phaser.Game({
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
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [new CampusScene()],
  });
}
