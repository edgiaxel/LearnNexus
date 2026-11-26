import { chromium } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const FFMPEG_PATH =
  process.env.FFMPEG_PATH ?? 'C:\\ffmpeg\\bin\\ffmpeg.exe';
const RECORDINGS_DIR = path.resolve(process.cwd(), 'recordings');

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

async function enterStudio(page, demoKey, courseCode = 'IF-4031', pauseMs = 0) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page
    .getByTestId('entry-gateway')
    .waitFor({ state: 'visible', timeout: 20000 });
  if (pauseMs > 0) await sleep(pauseMs);

  await page.getByTestId(`demo-profile-${demoKey}`).click();
  if (pauseMs > 0) await sleep(350);
  await page.getByTestId('demo-enter-btn').click();

  const card = page.getByTestId(`space-card-${courseCode}`);
  await card.waitFor({ state: 'visible', timeout: 20000 });
  if (pauseMs > 0) await sleep(pauseMs);

  await card.getByTestId('enter-studio-btn').click();
  await page
    .locator('h1')
    .filter({ hasText: 'Team Workspace Studio' })
    .waitFor({ state: 'visible', timeout: 20000 });
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
    await sleep(70);
    await page.keyboard.up(finalFacingKey);
  }
  await sleep(220);
}

async function ensureNearbyAndOpen(page, workstationId) {
  const nearby = await page.evaluate(
    () => window.__LEARNNEXUS_GAME__?.getState().nearbyWorkstation ?? null,
  );
  if (nearby !== workstationId) {
    await page.evaluate(
      (id) => window.__LEARNNEXUS_GAME__?.teleportToWorkstation(id) ?? false,
      workstationId,
    );
  }
  await page
    .getByTestId('workstation-prompt')
    .waitFor({ state: 'visible', timeout: 10000 });
  await sleep(300);
  await page.getByTestId('phaser-canvas-container').focus();
  await page.keyboard.press('KeyE');
  await page
    .getByTestId('workstation-drawer')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        '[data-testid="workstation-drawer"] [aria-busy="true"]',
      ).length === 0,
    null,
    { timeout: 20000 },
  );
}

async function closeDrawerWithEscape(page) {
  await page.keyboard.press('Escape');
  await page
    .getByTestId('workstation-drawer')
    .waitFor({ state: 'hidden', timeout: 10000 });
  await sleep(350);
}

async function getStrokeCount(page) {
  const text = await page.getByTestId('whiteboard-panel').innerText();
  const match = text.match(/(\d+)\s+strokes?/i);
  return match ? Number(match[1]) : 0;
}

async function waitForStrokeCount(page, expectedCount) {
  await page.waitForFunction(
    (expected) => {
      const panel = document.querySelector('[data-testid="whiteboard-panel"]');
      const text = panel?.textContent ?? '';
      const match = text.match(/(\d+)\s+strokes?/i);
      return (match ? Number(match[1]) : 0) === expected;
    },
    expectedCount,
    { timeout: 20000 },
  );
}

async function drawCozySageStroke(page) {
  await page.getByTestId('whiteboard-color-4A6B46').click();
  await page.getByTestId('whiteboard-width-4').click();

  const canvas = page.getByTestId('whiteboard-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Could not resolve boundingBox for whiteboard-canvas');
  }

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
}

async function recordTakeASingleUserCrud(browser) {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'learnnexus-take-a-'),
  );
  const outMp4 = path.join(
    RECORDINGS_DIR,
    'take-a-single-user-core-crud-1080p.mp4',
  );

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: tmpDir,
      size: { width: 1920, height: 1080 },
    },
  });

  let page;
  let video;
  let createdTaskId = null;
  let strokeAdded = false;

  try {
    page = await context.newPage();
    video = page.video();

    await enterStudio(page, 'team_lead', 'IF-4031', 900);
    await page
      .getByTestId('realtime-status-badge')
      .filter({ hasText: 'Live sync' })
      .waitFor({ state: 'visible', timeout: 20000 });
    await sleep(600);

    // Walk toward Project Overview workstation
    await walkPath(page, [{ x: 5.8 }, { y: 6.5 }, { x: 2.8 }], 'KeyW');
    await ensureNearbyAndOpen(page, 'overview');
    await page
      .getByTestId('project-title')
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(1500);
    await closeDrawerWithEscape(page);

    // Walk to Tasks meeting table and create demo task
    await walkPath(page, [{ x: 7.5 }, { y: 9.1 }, { x: 11.25 }], 'KeyW');
    await ensureNearbyAndOpen(page, 'tasks');
    await page
      .getByTestId('sprint-progress-summary')
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(600);

    await page.getByTestId('task-new-toggle-btn').click();
    await page
      .getByTestId('task-create-form')
      .waitFor({ state: 'visible', timeout: 10000 });
    await page
      .getByTestId('task-title-input')
      .fill('Finalize semifinal pitch slides');
    await page
      .getByTestId('task-description-input')
      .fill('Verify demo flow, screenshots, and live Postgres sync.');
    await page
      .getByTestId('task-assignee-select')
      .selectOption('11111111-1111-4111-8111-111111111102');
    await sleep(450);
    await page.getByTestId('task-create-submit-btn').click();

    const createdCard = page
      .locator('[data-testid^="task-item-"]')
      .filter({ hasText: 'Finalize semifinal pitch slides' });
    await createdCard.waitFor({ state: 'visible', timeout: 15000 });
    const attrId = await createdCard.getAttribute('data-testid');
    createdTaskId = attrId ? attrId.replace('task-item-', '') : null;
    await createdCard.scrollIntoViewIfNeeded();
    await sleep(1100);

    // Reload page to demonstrate real Postgres persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .locator('h1')
      .filter({ hasText: 'Team Workspace Studio' })
      .waitFor({ state: 'visible', timeout: 20000 });
    await waitForGameReady(page);
    await sleep(700);

    await walkPath(page, [{ x: 11.25 }, { y: 9.1 }], 'KeyW');
    await ensureNearbyAndOpen(page, 'tasks');

    if (createdTaskId) {
      const persistedCard = page.getByTestId(`task-item-${createdTaskId}`);
      await persistedCard.waitFor({ state: 'visible', timeout: 15000 });
      await persistedCard.scrollIntoViewIfNeeded();
      await sleep(900);

      await page
        .getByTestId(`task-status-select-${createdTaskId}`)
        .selectOption('in_progress');
      await page
        .getByTestId('tasks-save-indicator')
        .filter({ hasText: 'All changes saved' })
        .waitFor({ state: 'visible', timeout: 15000 });
      await sleep(1100);

      await page.getByTestId(`task-delete-btn-${createdTaskId}`).click();
      await sleep(350);
      await page.getByTestId(`task-delete-confirm-btn-${createdTaskId}`).click();
      await page.waitForFunction(
        (id) =>
          document.querySelectorAll(`[data-testid="task-item-${id}"]`)
            .length === 0,
        createdTaskId,
        { timeout: 15000 },
      );
      createdTaskId = null;
      await sleep(600);
    }

    await closeDrawerWithEscape(page);

    // Walk to Resource Library
    await walkPath(page, [{ x: 14.3 }, { y: 4.9 }, { x: 19.5 }], 'KeyW');
    await ensureNearbyAndOpen(page, 'resources');
    await page
      .locator('[data-testid^="resource-item-"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(1200);
    await closeDrawerWithEscape(page);

    // Walk to Team Whiteboard, draw clean sage stroke, undo, and return to studio
    await walkPath(page, [{ x: 14.4 }, { y: 4.0 }], 'KeyW');
    await ensureNearbyAndOpen(page, 'whiteboard');
    await page
      .getByTestId('whiteboard-canvas')
      .waitFor({ state: 'visible', timeout: 15000 });
    const beforeStrokes = await getStrokeCount(page);

    await drawCozySageStroke(page);
    await waitForStrokeCount(page, beforeStrokes + 1);
    strokeAdded = true;
    await sleep(1200);

    await page.getByTestId('whiteboard-undo-btn').click();
    await waitForStrokeCount(page, beforeStrokes);
    strokeAdded = false;
    await sleep(900);

    await closeDrawerWithEscape(page);
    await sleep(700);
  } finally {
    if (page && createdTaskId) {
      try {
        const delBtn = page.getByTestId(`task-delete-btn-${createdTaskId}`);
        if (await delBtn.isVisible()) {
          await delBtn.click();
          await page
            .getByTestId(`task-delete-confirm-btn-${createdTaskId}`)
            .click();
        }
      } catch {
        // Best-effort task cleanup.
      }
    }
    if (page && strokeAdded) {
      try {
        const undoBtn = page.getByTestId('whiteboard-undo-btn');
        if (await undoBtn.isEnabled()) {
          await undoBtn.click();
        }
      } catch {
        // Best-effort stroke cleanup.
      }
    }

    await context.close();
  }

  const webmPath = await video.path();
  try {
    execFileSync(
      FFMPEG_PATH,
      [
        '-y',
        '-i',
        webmPath,
        '-vf',
        'scale=1920:1080:flags=neighbor',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-r',
        '30',
        '-movflags',
        '+faststart',
        outMp4,
      ],
      { stdio: 'inherit' },
    );
    console.log(`Saved ${outMp4}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function recordTakeBMultiUserSplit(browser) {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'learnnexus-take-b-'),
  );
  const outMp4 = path.join(
    RECORDINGS_DIR,
    'take-b-multi-user-splitscreen-1080p.mp4',
  );

  const contextNadia = await browser.newContext({
    viewport: { width: 960, height: 1080 },
    recordVideo: {
      dir: tmpDir,
      size: { width: 960, height: 1080 },
    },
  });
  const contextBima = await browser.newContext({
    viewport: { width: 960, height: 1080 },
    recordVideo: {
      dir: tmpDir,
      size: { width: 960, height: 1080 },
    },
  });

  let pageNadia;
  let pageBima;
  let videoNadia;
  let videoBima;
  let strokeAdded = false;
  let createdNoteId = null;

  try {
    [pageNadia, pageBima] = await Promise.all([
      contextNadia.newPage(),
      contextBima.newPage(),
    ]);
    videoNadia = pageNadia.video();
    videoBima = pageBima.video();

    await Promise.all([
      enterStudio(pageNadia, 'team_lead', 'IF-4031', 500),
      enterStudio(pageBima, 'member', 'IF-4031', 500),
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
    await sleep(700);

    // Smooth concurrent walking toward center meeting area
    await Promise.all([
      walkPath(pageNadia, [{ x: 9.6 }, { y: 9.4 }], 'KeyD'),
      walkPath(pageBima, [{ x: 11.8 }, { y: 9.4 }], 'KeyA'),
    ]);

    await Promise.all([
      pageNadia
        .getByTestId('nearby-teammates-badge')
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima
        .getByTestId('nearby-teammates-badge')
        .waitFor({ state: 'visible', timeout: 15000 }),
    ]);
    await sleep(1100);

    // Two-way live chat
    const nadiaMsg = 'Hi Bima! Ready to review our sprint tasks?';
    const bimaMsg = "Yes Nadia! Let's sketch on the whiteboard next.";

    await pageNadia.getByTestId('studio-chat-toggle').click();
    await pageNadia
      .getByTestId('studio-chat-input')
      .waitFor({ state: 'visible', timeout: 10000 });
    await sleep(350);
    await pageNadia.getByTestId('studio-chat-input').fill(nadiaMsg);
    await sleep(350);
    await pageNadia.getByTestId('studio-chat-send-btn').click();

    await Promise.all([
      pageNadia
        .getByTestId('studio-chat-list')
        .filter({ hasText: nadiaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima
        .getByTestId('studio-chat-unread-badge')
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageBima.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ?? 0) >=
          1,
        null,
        { timeout: 15000 },
      ),
    ]);
    await sleep(900);

    await pageBima.getByTestId('studio-chat-toggle').click();
    await pageBima
      .getByTestId('studio-chat-list')
      .filter({ hasText: nadiaMsg })
      .waitFor({ state: 'visible', timeout: 15000 });
    await sleep(400);
    await pageBima.getByTestId('studio-chat-input').fill(bimaMsg);
    await sleep(350);
    await pageBima.getByTestId('studio-chat-send-btn').click();

    await Promise.all([
      pageBima
        .getByTestId('studio-chat-list')
        .filter({ hasText: bimaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageNadia
        .getByTestId('studio-chat-list')
        .filter({ hasText: bimaMsg })
        .waitFor({ state: 'visible', timeout: 15000 }),
      pageNadia.waitForFunction(
        () =>
          (window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ?? 0) >=
          1,
        null,
        { timeout: 15000 },
      ),
    ]);
    await sleep(1200);

    // Close chat panels cleanly before walking to whiteboard
    await Promise.all([
      pageNadia.getByTestId('studio-chat-toggle').click(),
      pageBima.getByTestId('studio-chat-toggle').click(),
    ]);
    await sleep(400);

    await Promise.all([
      walkPath(pageNadia, [{ x: 13.9 }, { y: 4.0 }], 'KeyW'),
      walkPath(pageBima, [{ x: 14.7 }, { y: 4.0 }], 'KeyW'),
    ]);

    await Promise.all([
      ensureNearbyAndOpen(pageNadia, 'whiteboard'),
      ensureNearbyAndOpen(pageBima, 'whiteboard'),
    ]);
    await sleep(900);

    const beforeStrokes = await getStrokeCount(pageNadia);

    // Nadia posts sticky note -> Bima sees live sticky note
    await pageNadia
      .getByTestId('whiteboard-note-input')
      .fill('Multi-user live sync test');
    await pageNadia.getByTestId('whiteboard-note-color-lavender').click();
    await sleep(300);
    await pageNadia.getByTestId('whiteboard-note-submit-btn').click();

    const noteCardNadia = pageNadia
      .locator('[data-testid^="whiteboard-note-item-"]')
      .filter({ hasText: 'Multi-user live sync test' });
    await noteCardNadia.waitFor({ state: 'visible', timeout: 15000 });
    const noteAttr = await noteCardNadia.getAttribute('data-testid');
    createdNoteId = noteAttr
      ? noteAttr.replace('whiteboard-note-item-', '')
      : null;

    if (createdNoteId) {
      await pageBima
        .getByTestId(`whiteboard-note-item-${createdNoteId}`)
        .waitFor({ state: 'visible', timeout: 20000 });
    }
    await sleep(900);

    // Nadia draws cozy sage stroke -> Bima sees live stroke
    await drawCozySageStroke(pageNadia);
    await Promise.all([
      waitForStrokeCount(pageNadia, beforeStrokes + 1),
      waitForStrokeCount(pageBima, beforeStrokes + 1),
    ]);
    strokeAdded = true;
    await sleep(1400);

    // Cleanly undo stroke and delete temporary sticky note
    await pageNadia.getByTestId('whiteboard-undo-btn').click();
    await Promise.all([
      waitForStrokeCount(pageNadia, beforeStrokes),
      waitForStrokeCount(pageBima, beforeStrokes),
    ]);
    strokeAdded = false;
    await sleep(500);

    if (createdNoteId) {
      await pageNadia
        .getByTestId(`whiteboard-note-delete-btn-${createdNoteId}`)
        .click();
      await sleep(300);
      await pageNadia
        .getByTestId(`whiteboard-note-delete-confirm-btn-${createdNoteId}`)
        .click();
      await Promise.all([
        pageNadia.waitForFunction(
          (id) =>
            document.querySelectorAll(
              `[data-testid="whiteboard-note-item-${id}"]`,
            ).length === 0,
          createdNoteId,
          { timeout: 15000 },
        ),
        pageBima.waitForFunction(
          (id) =>
            document.querySelectorAll(
              `[data-testid="whiteboard-note-item-${id}"]`,
            ).length === 0,
          createdNoteId,
          { timeout: 20000 },
        ),
      ]);
      createdNoteId = null;
    }

    await sleep(800);
  } finally {
    if (pageNadia && strokeAdded) {
      try {
        const undoBtn = pageNadia.getByTestId('whiteboard-undo-btn');
        if (await undoBtn.isEnabled()) {
          await undoBtn.click();
        }
      } catch {
        // Best-effort stroke cleanup.
      }
    }
    if (pageNadia && createdNoteId) {
      try {
        const delBtn = pageNadia.getByTestId(
          `whiteboard-note-delete-btn-${createdNoteId}`,
        );
        if (await delBtn.isVisible()) {
          await delBtn.click();
          await pageNadia
            .getByTestId(`whiteboard-note-delete-confirm-btn-${createdNoteId}`)
            .click();
        }
      } catch {
        // Best-effort sticky note cleanup.
      }
    }

    await Promise.all([contextNadia.close(), contextBima.close()]);
  }

  const [webmLeft, webmRight] = await Promise.all([
    videoNadia.path(),
    videoBima.path(),
  ]);

  try {
    execFileSync(
      FFMPEG_PATH,
      [
        '-y',
        '-i',
        webmLeft,
        '-i',
        webmRight,
        '-filter_complex',
        '[0:v]scale=960:1080:flags=neighbor[l];[1:v]scale=960:1080:flags=neighbor[r];[l][r]hstack=inputs=2:shortest=1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-r',
        '30',
        '-movflags',
        '+faststart',
        outMp4,
      ],
      { stdio: 'inherit' },
    );
    console.log(`Saved ${outMp4}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  await fs.mkdir(RECORDINGS_DIR, { recursive: true });
  const server = await ensureServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    await recordTakeASingleUserCrud(browser);
    await recordTakeBMultiUserSplit(browser);
    console.log(`Demo recordings generated in ${RECORDINGS_DIR}`);
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
