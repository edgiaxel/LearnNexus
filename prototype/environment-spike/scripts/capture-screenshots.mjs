import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spikeRoot = path.resolve(__dirname, '..');
const shotsDir = path.join(spikeRoot, 'screenshots');
fs.mkdirSync(shotsDir, { recursive: true });

const BASE_URL = 'http://127.0.0.1:4173';

function startViteServer() {
  const proc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: spikeRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 15000;
    const poll = async () => {
      if (Date.now() > deadline) {
        reject(new Error('Vite startup timeout'));
        return;
      }
      try {
        const res = await fetch(BASE_URL);
        if (res.ok) {
          resolve(proc);
          return;
        }
      } catch {
        // retry
      }
      setTimeout(poll, 200);
    };
    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('EADDRINUSE')) {
        reject(new Error('Port 4173 already in use'));
      }
    });
    poll();
  });
}

async function waitForSpike(page) {
  await page.waitForFunction(() => Boolean(window.__SPIKE__), { timeout: 15000 });
  await page.waitForTimeout(450);
}

async function main() {
  const viteProc = await startViteServer();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const consoleErrors = [];
  const pageErrors = [];
  const metrics = {
    configs: {},
    movementTests: {},
    collisionTests: {},
    interactionTests: {},
    consoleErrorCount: 0,
    pageErrorCount: 0,
  };

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 920 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Full Environment - Config A (16px @ 3x)
    await page.goto(`${BASE_URL}/?mode=config-a-16px&view=full`, { waitUntil: 'networkidle' });
    await waitForSpike(page);
    await page.waitForTimeout(500);
    metrics.configs.configA_full = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '01-full-environment-config-a-16px.png') });

    // 2. Full Environment - Config B (48px @ 1x)
    await page.goto(`${BASE_URL}/?mode=config-b-48px&view=full`, { waitUntil: 'networkidle' });
    await waitForSpike(page);
    await page.waitForTimeout(500);
    metrics.configs.configB_full = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '02-full-environment-config-b-48px.png') });

    // 3. Collision Debug Overlay (Config A Full View)
    await page.goto(`${BASE_URL}/?mode=config-a-16px&view=full`, { waitUntil: 'networkidle' });
    await waitForSpike(page);
    await page.evaluate(() => window.__SPIKE__.setDebug(true));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(shotsDir, '08-collision-debug-overlay.png') });

    // 4. Character Comparison - Config A (Follow View near Collaborative Table)
    await page.goto(`${BASE_URL}/?mode=config-a-16px&view=follow`, { waitUntil: 'networkidle' });
    await waitForSpike(page);
    await page.evaluate(() => window.__SPIKE__.teleportTile(11.0, 9.2, 'up'));
    await page.waitForTimeout(250);
    metrics.configs.configA_follow = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '03-character-comparison-config-a-16px.png') });

    // 5. Character Comparison - Config B (Follow View near Collaborative Table)
    await page.goto(`${BASE_URL}/?mode=config-b-48px&view=follow`, { waitUntil: 'networkidle' });
    await waitForSpike(page);
    await page.evaluate(() => window.__SPIKE__.teleportTile(11.0, 9.2, 'up'));
    await page.waitForTimeout(250);
    metrics.configs.configB_follow = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '04-character-comparison-config-b-48px.png') });

    // 6. Movement in 4 directions + Real Collision Stop Test (Config A Follow View)
    await page.goto(`${BASE_URL}/?mode=config-a-16px&view=follow`, { waitUntil: 'networkidle' });
    await waitForSpike(page);

    for (const [dir, key, shotName] of [
      ['down', 'ArrowDown', '05a-move-down.png'],
      ['right', 'ArrowRight', '05b-move-right.png'],
      ['up', 'ArrowUp', '05c-move-up.png'],
      ['left', 'ArrowLeft', '05d-move-left.png'],
    ]) {
      await page.evaluate(() => window.__SPIKE__.teleportTile(10.5, 10.5, 'down'));
      await page.waitForTimeout(100);
      const before = await page.evaluate(() => window.__SPIKE__.getState());
      await page.keyboard.down(key);
      await page.waitForTimeout(320);
      const midState = await page.evaluate(() => window.__SPIKE__.getState());
      await page.screenshot({ path: path.join(shotsDir, shotName) });
      await page.keyboard.up(key);
      metrics.movementTests[dir] = {
        before: { x: before.playerX, y: before.playerY },
        after: { x: midState.playerX, y: midState.playerY },
        facing: midState.facing,
        anim: midState.activeAnim,
      };
    }

    // Collision test: walk left into west border wall at x=1
    await page.evaluate(() => window.__SPIKE__.teleportTile(1.8, 11.5, 'left'));
    await page.waitForTimeout(100);
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(600);
    await page.keyboard.up('ArrowLeft');
    const afterWall = await page.evaluate(() => window.__SPIKE__.getState());
    metrics.collisionTests.westWall = {
      stoppedAtTileX: afterWall.playerTileX,
      blockedAboveTile1: afterWall.playerTileX >= 1.0 && afterWall.playerTileX < 1.6,
    };

    // 7. Interaction tests: Workstation Desk (prompt + open drawer)
    await page.evaluate(() => window.__SPIKE__.teleportTile(2.8, 6.2, 'up'));
    await page.waitForTimeout(250);
    const nearWs = await page.evaluate(() => window.__SPIKE__.getState());
    await page.click('#phaser-container canvas');
    await page.keyboard.down('KeyE');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyE');
    await page.waitForTimeout(200);
    const openWs = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '06-interaction-workstation-panel.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 8. Interaction test: Meeting Table prompt & Entrance Door prompt
    await page.evaluate(() => window.__SPIKE__.teleportTile(11.0, 8.6, 'up'));
    await page.waitForTimeout(250);
    const nearTable = await page.evaluate(() => window.__SPIKE__.getState());
    await page.screenshot({ path: path.join(shotsDir, '07-interaction-meeting-table-prompt.png') });

    await page.evaluate(() => window.__SPIKE__.teleportTile(3.5, 13.0, 'down'));
    await page.waitForTimeout(250);
    const nearDoor = await page.evaluate(() => window.__SPIKE__.getState());

    metrics.interactionTests = {
      workstationNearby: nearWs.nearbyObjectId,
      workstationPanelOpened: openWs.panelOpen,
      meetingTableNearby: nearTable.nearbyObjectId,
      entranceDoorNearby: nearDoor.nearbyObjectId,
    };

    metrics.consoleErrorCount = consoleErrors.length;
    metrics.pageErrorCount = pageErrors.length;
    metrics.consoleErrors = consoleErrors;
    metrics.pageErrors = pageErrors;

    fs.writeFileSync(path.join(shotsDir, 'capture-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
    console.log(JSON.stringify(metrics, null, 2));

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`Console/Page errors detected: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    }
  } finally {
    await browser.close();
    viteProc.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
