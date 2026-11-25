import './styles.css';
import type Phaser from 'phaser';
import {
  RENDER_CONFIGS,
  type RenderModeId,
  type ViewModeId,
} from './config/renderConfigs';
import { createSpikeGame } from './game/createSpikeGame';
import { spikeBridge } from './game/spikeBridge';

const params = new URLSearchParams(window.location.search);
let currentMode: RenderModeId =
  params.get('mode') === 'config-b-48px' ? 'config-b-48px' : 'config-a-16px';
let currentView: ViewModeId = params.get('view') === 'full' ? 'full' : 'follow';
let activeGame: Phaser.Game | null = null;

const container = document.getElementById('phaser-container') as HTMLElement;
const btnA = document.getElementById('btn-config-a') as HTMLButtonElement;
const btnB = document.getElementById('btn-config-b') as HTMLButtonElement;
const btnView = document.getElementById('btn-view-mode') as HTMLButtonElement;
const btnDebug = document.getElementById('btn-debug') as HTMLButtonElement;

const promptEl = document.getElementById('interaction-prompt') as HTMLElement;
const promptLabel = document.getElementById('prompt-label') as HTMLElement;
const drawerEl = document.getElementById('interaction-drawer') as HTMLElement;
const drawerCategory = document.getElementById('drawer-category') as HTMLElement;
const drawerTitle = document.getElementById('drawer-title') as HTMLElement;
const drawerSummary = document.getElementById('drawer-summary') as HTMLElement;
const drawerNotes = document.getElementById('drawer-notes') as HTMLElement;
const btnCloseDrawer = document.getElementById('btn-close-drawer') as HTMLButtonElement;

const mMode = document.getElementById('m-mode') as HTMLElement;
const mTile = document.getElementById('m-tile') as HTMLElement;
const mZoom = document.getElementById('m-zoom') as HTMLElement;
const mFps = document.getElementById('m-fps') as HTMLElement;
const mPos = document.getElementById('m-pos') as HTMLElement;
const mFacing = document.getElementById('m-facing') as HTMLElement;
const mAnim = document.getElementById('m-anim') as HTMLElement;

function syncButtons(): void {
  btnA.classList.toggle('is-active', currentMode === 'config-a-16px');
  btnB.classList.toggle('is-active', currentMode === 'config-b-48px');
  btnView.textContent = currentView === 'full' ? 'View: Full Room' : 'View: Follow';
  btnView.classList.toggle('is-active', currentView === 'full');
}

function mountGame(): void {
  if (activeGame) {
    activeGame.destroy(true);
    activeGame = null;
  }
  promptEl.hidden = true;
  drawerEl.hidden = true;
  btnDebug.classList.remove('is-active');
  syncButtons();

  const cfg = RENDER_CONFIGS[currentMode];
  mMode.textContent = cfg.id;
  mTile.textContent = `${cfg.tileSize}px`;
  mZoom.textContent = `${cfg.cameraZoom}x`;
  activeGame = createSpikeGame(container, cfg, currentView);
}

btnA.addEventListener('click', () => {
  if (currentMode === 'config-a-16px') return;
  currentMode = 'config-a-16px';
  mountGame();
});

btnB.addEventListener('click', () => {
  if (currentMode === 'config-b-48px') return;
  currentMode = 'config-b-48px';
  mountGame();
});

btnView.addEventListener('click', () => {
  currentView = currentView === 'follow' ? 'full' : 'follow';
  mountGame();
});

btnDebug.addEventListener('click', () => {
  const next = !btnDebug.classList.contains('is-active');
  btnDebug.classList.toggle('is-active', next);
  spikeBridge.emit('debug:changed', next);
});

function closeDrawer(): void {
  if (drawerEl.hidden) return;
  drawerEl.hidden = true;
  spikeBridge.emit('panel:closed', undefined);
}

btnCloseDrawer.addEventListener('click', closeDrawer);
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && !drawerEl.hidden) {
    closeDrawer();
  }
});

spikeBridge.on('proximity:change', (payload) => {
  if (!payload) {
    promptEl.hidden = true;
    return;
  }
  promptLabel.textContent = payload.label;
  promptEl.hidden = false;
});

spikeBridge.on('object:interact', (payload) => {
  promptEl.hidden = true;
  drawerCategory.textContent = payload.category;
  drawerTitle.textContent = payload.label;
  drawerSummary.textContent = payload.summary;
  drawerNotes.textContent = `${payload.notes} (Object ID: ${payload.objectId} at tile ${payload.tileX}, ${payload.tileY})`;
  drawerEl.hidden = false;
  btnCloseDrawer.focus();
});

spikeBridge.on('debug:changed', (enabled) => {
  btnDebug.classList.toggle('is-active', enabled);
});

spikeBridge.on('metrics:update', (m) => {
  mFps.textContent = String(m.fps);
  mPos.textContent = `${m.playerTileX}, ${m.playerTileY}`;
  mFacing.textContent = m.facing;
  mAnim.textContent = m.activeAnim;
});

mountGame();
