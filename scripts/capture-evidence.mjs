import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ?? 'C:\\ffmpeg\\bin\\ffmpeg.exe';
const SCREENSHOT_DIR = path.resolve(
  process.cwd(),
  'docs',
  'evidence',
  'screenshots',
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isServerReachable(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(baseUrl, { signal: controller.signal });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureServer() {
  if (await isServerReachable(BASE_URL)) {
    console.log(`[ensureServer] Reusing running server at ${BASE_URL}`);
    return { spawned: false, cleanup: async () => {} };
  }

  const parsed = new URL(BASE_URL);
  const hostname = parsed.hostname;
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(
      `BASE_URL (${BASE_URL}) is unreachable and auto-start only supports localhost or 127.0.0.1.`,
    );
  }

  const port = parsed.port || '5173';
  console.log(`[ensureServer] Starting Vite dev server at ${BASE_URL}...`);

  const child =
    process.platform === 'win32'
      ? spawn(
          'cmd.exe',
          ['/c', `npm run dev -- --host ${hostname} --port ${port}`],
          {
            cwd: process.cwd(),
            stdio: 'ignore',
            windowsHide: true,
          },
        )
      : spawn(
          'npm',
          ['run', 'dev', '--', '--host', hostname, '--port', port],
          {
            cwd: process.cwd(),
            stdio: 'ignore',
            detached: true,
          },
        );

  let exited = false;
  let exitCode = null;
  child.once('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  const cleanup = async () => {
    if (!child.pid) return;
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore',
        });
      } catch {
        // Ignore if process tree already stopped.
      }
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        try {
          child.kill('SIGTERM');
        } catch {
          // Ignore if process already stopped.
        }
      }
    }
  };

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `Vite server exited prematurely with code ${String(exitCode)}.`,
      );
    }
    if (await isServerReachable(BASE_URL)) {
      console.log(`[ensureServer] Server ready at ${BASE_URL}`);
      return { spawned: true, cleanup };
    }
    await sleep(500);
  }

  await cleanup();
  throw new Error(`Timed out waiting for ${BASE_URL} to return HTTP 200.`);
}

async function waitForGameReady(page) {
  await page.waitForFunction(
    () => window.__LEARNNEXUS_GAME__?.getState().ready === true,
    null,
    { timeout: 20000 },
  );
  return page.evaluate(() => window.__LEARNNEXUS_GAME__?.getState() ?? null);
}

async function signInAsDemo(page, demoKey) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('entry-gateway').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByTestId(`demo-profile-${demoKey}`).click();
  await page.getByTestId('demo-enter-btn').click();
}

async function enterStudio(page, demoKey, courseCode = 'IF-4031') {
  await signInAsDemo(page, demoKey);
  const card = page.getByTestId(`space-card-${courseCode}`);
  await card.waitFor({ state: 'visible', timeout: 20000 });
  await card.getByTestId('enter-studio-btn').click();
  await page.locator('h1').filter({ hasText: 'Team Workspace Studio' }).waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await waitForGameReady(page);
}

async function walkAxis(page, axis, targetCoord) {
  const prop = axis === 'x' ? 'playerTileX' : 'playerTileY';
  const initial = await page.evaluate(
    (key) => window.__LEARNNEXUS_GAME__?.getState()?.[key] ?? null,
    prop,
  );
  if (initial === null || Math.abs(initial - targetCoord) <= 0.25) {
    return;
  }

  const movePositive = initial < targetCoord;
  const key =
    axis === 'x'
      ? movePositive
        ? 'KeyD'
        : 'KeyA'
      : movePositive
        ? 'KeyS'
        : 'KeyW';

  await page.keyboard.down(key);
  try {
    const deadline = Date.now() + 4500;
    while (Date.now() < deadline) {
      const current = await page.evaluate(
        (p) => window.__LEARNNEXUS_GAME__?.getState()?.[p] ?? null,
        prop,
      );
      if (current === null) break;
      if (movePositive && current >= targetCoord - 0.14) break;
      if (!movePositive && current <= targetCoord + 0.14) break;
      await sleep(45);
    }
  } finally {
    await page.keyboard.up(key);
  }
}

async function walkPath(page, waypoints, finalFacingKey) {
  const container = page.getByTestId('phaser-canvas-container');
  await container.click({ position: { x: 24, y: 24 } });
  await container.focus();

  for (const wp of waypoints) {
    if (typeof wp.x === 'number') {
      await walkAxis(page, 'x', wp.x);
    }
    if (typeof wp.y === 'number') {
      await walkAxis(page, 'y', wp.y);
    }
  }

  if (finalFacingKey) {
    await page.keyboard.down(finalFacingKey);
    await sleep(60);
    await page.keyboard.up(finalFacingKey);
  }
  await sleep(180);
}

async function openWorkstation(page, workstationId) {
  const ok = await page.evaluate(
    (id) => window.__LEARNNEXUS_GAME__?.teleportToWorkstation(id) ?? false,
    workstationId,
  );
  if (!ok) {
    throw new Error(`teleportToWorkstation(${workstationId}) failed`);
  }
  const prompt = page.getByTestId('workstation-prompt');
  await prompt.waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('phaser-canvas-container').focus();
  await page.keyboard.press('KeyE');
  const drawer = page.getByTestId('workstation-drawer');
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '[data-testid="workstation-drawer"] [aria-busy="true"]',
      ).length === 0,
    null,
    { timeout: 20000 },
  );
}

async function closeWorkstation(page) {
  await page.getByTestId('close-drawer-btn').click();
  await page
    .getByTestId('workstation-drawer')
    .waitFor({ state: 'hidden', timeout: 10000 });
}

async function getStrokeCount(page) {
  const text = await page.getByTestId('whiteboard-panel').innerText();
  const match = text.match(/(\d+)\s+strokes?/i);
  return match ? Number(match[1]) : 0;
}

async function captureSingleUserEvidence(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // 01-entry-gateway.png
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page
      .getByTestId('entry-gateway')
      .waitFor({ state: 'visible', timeout: 20000 });
    await page
      .locator('header [role="status"]')
      .filter({ hasText: 'Supabase connected' })
      .waitFor({ state: 'visible', timeout: 20000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-entry-gateway.png'),
    });
    console.log('Captured 01-entry-gateway.png');

    // 02-academic-spaces.png
    await page.getByTestId('demo-profile-team_lead').click();
    await page.getByTestId('demo-enter-btn').click();
    await page
      .getByTestId('academic-spaces-directory')
      .waitFor({ state: 'visible', timeout: 20000 });
    await page
      .getByTestId('space-card-IF-4031')
      .waitFor({ state: 'visible', timeout: 20000 });
    await page
      .getByTestId('space-card-IF-3210')
      .waitFor({ state: 'visible', timeout: 20000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-academic-spaces.png'),
    });
    console.log('Captured 02-academic-spaces.png');

    // 03-studio-pixel-canvas.png
    await page
      .getByTestId('space-card-IF-4031')
      .getByTestId('enter-studio-btn')
      .click();
    await page
      .locator('h1')
      .filter({ hasText: 'Team Workspace Studio' })
      .waitFor({ state: 'visible', timeout: 20000 });
    await waitForGameReady(page);
    await page
      .getByTestId('realtime-status-badge')
      .filter({ hasText: 'Live sync' })
      .waitFor({ state: 'visible', timeout: 20000 });

    await walkPath(page, [{ x: 11.25 }, { y: 9.1 }], 'KeyW');
    const currentNearby = await page.evaluate(
      () => window.__LEARNNEXUS_GAME__?.getState().nearbyWorkstation ?? null,
    );
    if (currentNearby !== 'tasks') {
      await page.evaluate(() =>
        window.__LEARNNEXUS_GAME__?.teleportToWorkstation('tasks'),
      );
    }
    await page
      .getByTestId('workstation-prompt')
      .waitFor({ state: 'visible', timeout: 10000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-studio-pixel-canvas.png'),
    });
    console.log('Captured 03-studio-pixel-canvas.png');

    // 04-workstation-overview.png
    await openWorkstation(page, 'overview');
    await page
      .getByTestId('project-title')
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-workstation-overview.png'),
    });
    console.log('Captured 04-workstation-overview.png');
    await closeWorkstation(page);

    // 05-workstation-tasks-crud.png
    await openWorkstation(page, 'tasks');
    await page
      .getByTestId('sprint-progress-summary')
      .waitFor({ state: 'visible', timeout: 15000 });
    await page
      .locator('[data-testid^="task-item-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-workstation-tasks-crud.png'),
    });
    console.log('Captured 05-workstation-tasks-crud.png');
    await closeWorkstation(page);

    // 06-workstation-resources.png
    await openWorkstation(page, 'resources');
    await page
      .locator('[data-testid^="resource-item-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-workstation-resources.png'),
    });
    console.log('Captured 06-workstation-resources.png');
    await closeWorkstation(page);

    // 07-workstation-whiteboard.png
    await openWorkstation(page, 'whiteboard');
    const canvas = page.getByTestId('whiteboard-canvas');
    await canvas.waitFor({ state: 'visible', timeout: 15000 });
    await canvas.scrollIntoViewIfNeeded();
    const beforeStrokes = await getStrokeCount(page);

    await page.getByTestId('whiteboard-color-4A6B46').click();
    await page.getByTestId('whiteboard-width-4').click();

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Could not resolve boundingBox for whiteboard-canvas');
    }

    let strokeSaved = false;
    try {
      const pts = [
        [0.34, 0.78],
        [0.34, 0.48],
        [0.5, 0.22],
        [0.66, 0.48],
        [0.34, 0.48],
        [0.66, 0.48],
        [0.66, 0.78],
        [0.34, 0.78],
      ];

      await page.mouse.move(
        box.x + box.width * pts[0][0],
        box.y + box.height * pts[0][1],
      );
      await page.mouse.down();
      for (let i = 1; i < pts.length; i += 1) {
        await page.mouse.move(
          box.x + box.width * pts[i][0],
          box.y + box.height * pts[i][1],
          { steps: 6 },
        );
      }
      await page.mouse.up();

      await page.waitForFunction(
        (expected) => {
          const panel = document.querySelector(
            '[data-testid="whiteboard-panel"]',
          );
          const text = panel?.textContent ?? '';
          const match = text.match(/(\d+)\s+strokes?/i);
          const count = match ? Number(match[1]) : 0;
          const undoBtn = document.querySelector(
            '[data-testid="whiteboard-undo-btn"]',
          );
          return count >= expected && undoBtn && !undoBtn.hasAttribute('disabled');
        },
        beforeStrokes + 1,
        { timeout: 15000 },
      );
      strokeSaved = true;

      await sleep(250);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-workstation-whiteboard.png'),
      });
      console.log('Captured 07-workstation-whiteboard.png');
    } finally {
      if (strokeSaved) {
        const undoBtn = page.getByTestId('whiteboard-undo-btn');
        if (await undoBtn.isEnabled()) {
          await undoBtn.click();
          await page.waitForFunction(
            (expected) => {
              const panel = document.querySelector(
                '[data-testid="whiteboard-panel"]',
              );
              const text = panel?.textContent ?? '';
              const match = text.match(/(\d+)\s+strokes?/i);
              return (match ? Number(match[1]) : 0) === expected;
            },
            beforeStrokes,
            { timeout: 15000 },
          );
        }
      }
    }
    await closeWorkstation(page);

    // 08-unassigned-guest-empty.png
    await page.getByTestId('sign-out-btn').click();
    await page
      .getByTestId('entry-gateway')
      .waitFor({ state: 'visible', timeout: 20000 });
    await page.getByTestId('demo-profile-guest_empty').click();
    await page.getByTestId('demo-enter-btn').click();
    await page
      .getByTestId('spaces-empty-state')
      .waitFor({ state: 'visible', timeout: 20000 });
    await sleep(250);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-unassigned-guest-empty.png'),
    });
    console.log('Captured 08-unassigned-guest-empty.png');
  } finally {
    await context.close();
  }
}

async function captureMultiUserSplitEvidence(browser) {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'learnnexus-evidence-split-'),
  );
  const contextNadia = await browser.newContext({
    viewport: { width: 960, height: 1080 },
  });
  const contextBima = await browser.newContext({
    viewport: { width: 960, height: 1080 },
  });

  try {
    const [pageNadia, pageBima] = await Promise.all([
      contextNadia.newPage(),
      contextBima.newPage(),
    ]);

    await Promise.all([
      enterStudio(pageNadia, 'team_lead', 'IF-4031'),
      enterStudio(pageBima, 'member', 'IF-4031'),
    ]);

    await Promise.all([
      pageNadia
        .getByTestId('realtime-status-badge')
        .filter({ hasText: 'Live sync' })
        .waitFor({ state: 'visible', timeout: 20000 }),
      pageBima
        .getByTestId('realtime-status-badge')
        .filter({ hasText: 'Live sync' })
        .waitFor({ state: 'visible', timeout: 20000 }),
      pageNadia
        .getByTestId('online-teammates-btn')
        .filter({ hasText: 'Online (2)' })
        .waitFor({ state: 'visible', timeout: 20000 }),
      pageBima
        .getByTestId('online-teammates-btn')
        .filter({ hasText: 'Online (2)' })
        .waitFor({ state: 'visible', timeout: 20000 }),
    ]);

    await Promise.all([
      pageNadia.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().remotePlayerCount ?? 0) >= 1,
        null,
        { timeout: 15000 },
      ),
      pageBima.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().remotePlayerCount ?? 0) >= 1,
        null,
        { timeout: 15000 },
      ),
    ]);

    await Promise.all([
      walkPath(pageNadia, [{ x: 8.6 }, { y: 9.4 }], 'KeyD'),
      walkPath(pageBima, [{ x: 12.5 }, { y: 9.4 }], 'KeyA'),
    ]);

    await Promise.all([
      pageNadia
        .getByTestId('nearby-teammates-badge')
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima
        .getByTestId('nearby-teammates-badge')
        .waitFor({ state: 'visible', timeout: 15000 }),
    ]);
    await sleep(350);

    await Promise.all([
      pageNadia.getByTestId('studio-chat-toggle').click(),
      pageBima.getByTestId('studio-chat-toggle').click(),
    ]);
    await Promise.all([
      pageNadia
        .getByTestId('studio-chat-input')
        .waitFor({ state: 'visible', timeout: 10000 }),
      pageBima
        .getByTestId('studio-chat-input')
        .waitFor({ state: 'visible', timeout: 10000 }),
    ]);

    const nadiaMsg = 'Hi Bima! Ready to review sprint tasks?';
    const bimaMsg = 'Yes! Moving to the whiteboard now.';

    await pageNadia.getByTestId('studio-chat-input').fill(nadiaMsg);
    await pageNadia.getByTestId('studio-chat-send-btn').click();
    await Promise.all([
      pageNadia
        .getByTestId('studio-chat-list')
        .filter({ hasText: nadiaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima
        .getByTestId('studio-chat-list')
        .filter({ hasText: nadiaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
    ]);

    await pageBima.getByTestId('studio-chat-input').fill(bimaMsg);
    await pageBima.getByTestId('studio-chat-send-btn').click();
    await Promise.all([
      pageNadia
        .getByTestId('studio-chat-list')
        .filter({ hasText: bimaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima
        .getByTestId('studio-chat-list')
        .filter({ hasText: bimaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageNadia.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ?? 0) >=
          1,
        null,
        { timeout: 10000 },
      ),
      pageBima.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ?? 0) >=
          1,
        null,
        { timeout: 10000 },
      ),
    ]);

    await sleep(250);

    const leftPng = path.join(tmpDir, 'left-nadia.png');
    const rightPng = path.join(tmpDir, 'right-bima.png');
    const outPng = path.join(SCREENSHOT_DIR, '09-multiuser-realtime-split.png');

    await Promise.all([
      pageNadia.screenshot({ path: leftPng }),
      pageBima.screenshot({ path: rightPng }),
    ]);

    execFileSync(
      FFMPEG_PATH,
      [
        '-y',
        '-i',
        leftPng,
        '-i',
        rightPng,
        '-filter_complex',
        '[0:v]scale=960:1080:flags=neighbor[l];[1:v]scale=960:1080:flags=neighbor[r];[l][r]hstack=inputs=2',
        '-frames:v',
        '1',
        outPng,
      ],
      { stdio: 'inherit' },
    );

    console.log('Captured 09-multiuser-realtime-split.png');
  } finally {
    await Promise.all([contextNadia.close(), contextBima.close()]);
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const server = await ensureServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    await captureSingleUserEvidence(browser);
    await captureMultiUserSplitEvidence(browser);
    console.log(`All 9 screenshots written to ${SCREENSHOT_DIR}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    await server.cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
