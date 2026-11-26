import { expect, test, type Page } from '@playwright/test';
import {
  signInAsDemoAndEnterStudio,
  waitForGameReady,
} from './helpers/authFlow';

const PROJECT_OVERVIEW_ORIGINAL = {
  title: 'LearnNexus Semifinal Demonstrator',
  description:
    'Build an asynchronous-first virtual campus studio connecting a 2D pixel-art room with durable team project panels backed by Supabase Postgres and RLS.',
};

function trackRuntimeErrors(
  page: Page,
  allowedConsoleSubstrings: readonly string[] = [],
): () => void {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const isAllowed = allowedConsoleSubstrings.some((allowed) =>
      text.includes(allowed),
    );
    if (!isAllowed) {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  return () => {
    expect(
      consoleErrors,
      `Unexpected console errors: ${consoleErrors.join('; ')}`,
    ).toEqual([]);
    expect(
      pageErrors,
      `Unexpected page errors: ${pageErrors.join('; ')}`,
    ).toEqual([]);
  };
}

async function openWorkstationDrawer(
  page: Page,
  workstationId: 'overview' | 'tasks' | 'resources' | 'whiteboard',
): Promise<void> {
  const teleported = await page.evaluate(
    (wsId) => window.__LEARNNEXUS_GAME__?.teleportToWorkstation(wsId) ?? false,
    workstationId,
  );
  expect(teleported, `teleportToWorkstation("${workstationId}") failed`).toBe(
    true,
  );

  const prompt = page.getByTestId('workstation-prompt');
  await expect(prompt).toBeVisible({ timeout: 10000 });
  await prompt.click();

  const drawer = page.getByTestId('workstation-drawer');
  await expect(drawer).toBeVisible({ timeout: 10000 });
  await expect(drawer).toHaveAttribute('data-workstation-id', workstationId);
}

async function closeWorkstationDrawer(page: Page): Promise<void> {
  await page.getByTestId('close-drawer-btn').click();
  await expect(page.getByTestId('workstation-drawer')).toBeHidden();
}

test.describe('Scoped M6 Realtime Collaboration & M9 Project Management + Whiteboard', () => {
  test('M6 multi-user realtime presence, movement sync, proximity cue, and persisted avatar chat bubbles', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      const assertNoErrorsA = trackRuntimeErrors(pageA);
      const assertNoErrorsB = trackRuntimeErrors(pageB);

      await Promise.all([
        signInAsDemoAndEnterStudio(pageA, 'team_lead', 'IF-4031'),
        signInAsDemoAndEnterStudio(pageB, 'member', 'IF-4031'),
      ]);

      await expect(pageA.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );
      await expect(pageB.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );

      await expect(pageA.getByTestId('online-teammates-btn')).toContainText(
        'Online (2)',
        { timeout: 20000 },
      );
      await expect(pageB.getByTestId('online-teammates-btn')).toContainText(
        'Online (2)',
        { timeout: 20000 },
      );

      await expect
        .poll(() =>
          pageA.evaluate(() => {
            const s = window.__LEARNNEXUS_GAME__?.getState();
            return s
              ? {
                  localSpriteKey: s.localSpriteKey,
                  remotePlayerCount: s.remotePlayerCount,
                }
              : null;
          }),
        )
        .toEqual({ localSpriteKey: 'adam', remotePlayerCount: 1 });

      await expect
        .poll(() =>
          pageB.evaluate(() => {
            const s = window.__LEARNNEXUS_GAME__?.getState();
            return s
              ? {
                  localSpriteKey: s.localSpriteKey,
                  remotePlayerCount: s.remotePlayerCount,
                }
              : null;
          }),
        )
        .toEqual({ localSpriteKey: 'bob', remotePlayerCount: 1 });

      // Both players spawn near entrance, so proximity peer cue should activate.
      await expect(pageA.getByTestId('nearby-teammates-badge')).toBeVisible({
        timeout: 15000,
      });

      // Verify Studio Chat input does not let Phaser capture arrow keys while typing.
      const uniqueMessage = `Live studio sync check ${Date.now()}`;
      await pageA.getByTestId('studio-chat-toggle').click();
      await expect(pageA.getByTestId('studio-chat-panel')).toBeVisible();

      const beforeMove = await pageA.evaluate(
        () => window.__LEARNNEXUS_GAME__?.getState(),
      );
      const chatInputA = pageA.getByTestId('studio-chat-input');
      await chatInputA.click();
      await chatInputA.fill(uniqueMessage);
      await pageA.keyboard.press('ArrowLeft');
      await pageA.waitForTimeout(150);
      const duringTyping = await pageA.evaluate(
        () => window.__LEARNNEXUS_GAME__?.getState(),
      );
      expect(duringTyping?.playerTileX).toBe(beforeMove?.playerTileX);

      await pageA.getByTestId('studio-chat-send-btn').click();
      await expect(pageA.getByTestId('studio-chat-list')).toContainText(
        uniqueMessage,
        { timeout: 15000 },
      );

      // Teammate B sees unread badge -> opens chat -> sees persisted message + canvas speech bubble.
      await expect(
        pageB.getByTestId('studio-chat-unread-badge'),
      ).toBeVisible({ timeout: 15000 });
      await expect
        .poll(
          () =>
            pageB.evaluate(
              () =>
                window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ??
                0,
            ),
          { timeout: 15000 },
        )
        .toBeGreaterThanOrEqual(1);

      await pageB.getByTestId('studio-chat-toggle').click();
      await expect(pageB.getByTestId('studio-chat-list')).toContainText(
        uniqueMessage,
        { timeout: 15000 },
      );

      // Verify Nadia's movement updates Bima's nearby peer state.
      await pageA.evaluate(() =>
        window.__LEARNNEXUS_GAME__?.teleportToWorkstation('resources'),
      );
      await expect(pageB.getByTestId('nearby-teammates-badge')).toBeHidden({
        timeout: 15000,
      });

      // Reload pageA to prove Studio Chat history persists in Postgres.
      await pageA.reload();
      await expect(pageA.locator('h1')).toHaveText('Team Workspace Studio', {
        timeout: 15000,
      });
      await waitForGameReady(pageA);
      await pageA.getByTestId('studio-chat-toggle').click();
      await expect(pageA.getByTestId('studio-chat-list')).toContainText(
        uniqueMessage,
        { timeout: 15000 },
      );

      assertNoErrorsA();
      assertNoErrorsB();
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('M9 full Task CRUD updates live across two concurrent browser sessions and cleans up cleanly', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const initialTitle = `E2E Live Task ${Date.now()}`;
    const editedTitle = `${initialTitle} Updated`;
    let createdTaskId: string | null = null;
    let pageA: Page | null = null;

    try {
      pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      const assertNoErrorsA = trackRuntimeErrors(pageA);
      const assertNoErrorsB = trackRuntimeErrors(pageB);

      await Promise.all([
        signInAsDemoAndEnterStudio(pageA, 'team_lead', 'IF-4031'),
        signInAsDemoAndEnterStudio(pageB, 'member', 'IF-4031'),
      ]);

      await expect(pageA.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );
      await expect(pageB.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );

      await Promise.all([
        openWorkstationDrawer(pageA, 'tasks'),
        openWorkstationDrawer(pageB, 'tasks'),
      ]);

      await expect(pageA.getByTestId('sprint-progress-summary')).toBeVisible({
        timeout: 15000,
      });

      await pageA.getByTestId('task-new-toggle-btn').click();
      await expect(pageA.getByTestId('task-create-form')).toBeVisible();
      await pageA.getByTestId('task-title-input').fill(initialTitle);
      await pageA
        .getByTestId('task-description-input')
        .fill('Created during multi-session E2E verification.');
      await pageA
        .getByTestId('task-assignee-select')
        .selectOption('11111111-1111-4111-8111-111111111102');
      await pageA.getByTestId('task-due-input').fill('2026-12-10');
      await pageA.getByTestId('task-create-submit-btn').click();

      const createdCardA = pageA
        .locator('[data-testid^="task-item-"]')
        .filter({ hasText: initialTitle });
      await expect(createdCardA).toBeVisible({ timeout: 15000 });
      const attrId = await createdCardA.getAttribute('data-testid');
      createdTaskId = attrId ? attrId.replace('task-item-', '') : null;
      expect(createdTaskId).toBeTruthy();

      // Bima sees the newly created task live without reloading or pressing Refresh.
      const createdCardB = pageB.getByTestId(`task-item-${createdTaskId}`);
      await expect(createdCardB).toBeVisible({ timeout: 20000 });
      await expect(createdCardB).toContainText('Bima Santoso (Demo)');

      // Nadia edits the task title -> Bima sees the update live.
      await pageA.getByTestId(`task-edit-btn-${createdTaskId}`).click();
      await pageA
        .getByTestId(`task-edit-title-input-${createdTaskId}`)
        .fill(editedTitle);
      await pageA.getByTestId(`task-edit-save-btn-${createdTaskId}`).click();

      await expect(createdCardA).toContainText(editedTitle, {
        timeout: 15000,
      });
      await expect(createdCardB).toContainText(editedTitle, {
        timeout: 20000,
      });

      // Nadia deletes the task -> Bima sees it disappear live.
      await pageA.getByTestId(`task-delete-btn-${createdTaskId}`).click();
      await pageA.getByTestId(`task-delete-confirm-btn-${createdTaskId}`).click();

      await expect(pageA.getByTestId(`task-item-${createdTaskId}`)).toHaveCount(
        0,
        { timeout: 15000 },
      );
      await expect(pageB.getByTestId(`task-item-${createdTaskId}`)).toHaveCount(
        0,
        { timeout: 20000 },
      );
      createdTaskId = null;

      assertNoErrorsA();
      assertNoErrorsB();
    } finally {
      if (createdTaskId && pageA) {
        try {
          const deleteBtn = pageA.getByTestId(
            `task-delete-btn-${createdTaskId}`,
          );
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            await pageA
              .getByTestId(`task-delete-confirm-btn-${createdTaskId}`)
              .click();
            await expect(
              pageA.getByTestId(`task-item-${createdTaskId}`),
            ).toHaveCount(0, { timeout: 10000 });
          }
        } catch {
          // Best-effort cleanup if browser closed early.
        }
      }
      await contextA.close();
      await contextB.close();
    }
  });

  test('M9 Project Brief edit, real Activity Log, and Resource Library safe-link CRUD persist cleanly', async ({
    page,
  }) => {
    const assertNoErrors = trackRuntimeErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAsDemoAndEnterStudio(page, 'team_lead', 'IF-4031');

    const editedDescription = `${PROJECT_OVERVIEW_ORIGINAL.description} E2E verified.`;
    let briefModified = false;
    let createdResourceId: string | null = null;
    const resourceTitle = `E2E Reference ${Date.now()}`;

    try {
      await openWorkstationDrawer(page, 'overview');

      await expect(page.getByTestId('project-title')).toHaveText(
        PROJECT_OVERVIEW_ORIGINAL.title,
        { timeout: 15000 },
      );
      await expect(page.getByTestId('team-roster-list')).toContainText(
        'In studio',
        { timeout: 15000 },
      );

      await page.getByTestId('overview-edit-btn').click();
      await page
        .getByTestId('overview-description-input')
        .fill(editedDescription);
      briefModified = true;
      await page.getByTestId('overview-save-btn').click();

      await expect(page.getByTestId('project-overview-panel')).toContainText(
        editedDescription,
        { timeout: 15000 },
      );
      await expect(page.getByTestId('project-activity-list')).toContainText(
        'updated project overview',
        { timeout: 15000 },
      );

      // Reload and confirm edited brief persisted, then restore original brief cleanly.
      await page.reload();
      await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
        timeout: 15000,
      });
      await waitForGameReady(page);

      await openWorkstationDrawer(page, 'overview');
      await expect(page.getByTestId('project-overview-panel')).toContainText(
        editedDescription,
        { timeout: 15000 },
      );

      await page.getByTestId('overview-edit-btn').click();
      await page
        .getByTestId('overview-description-input')
        .fill(PROJECT_OVERVIEW_ORIGINAL.description);
      await page.getByTestId('overview-save-btn').click();
      await expect(page.getByTestId('project-overview-panel')).toContainText(
        PROJECT_OVERVIEW_ORIGINAL.description,
        { timeout: 15000 },
      );
      briefModified = false;
      await closeWorkstationDrawer(page);

      // Resource Library CRUD + unsafe URL validation
      await openWorkstationDrawer(page, 'resources');
      await page.getByTestId('resource-new-toggle-btn').click();
      await expect(page.getByTestId('resource-create-form')).toBeVisible();

      await page.getByTestId('resource-title-input').fill(resourceTitle);
      await page
        .getByTestId('resource-url-input')
        .fill('javascript:alert(1)');
      await page.getByTestId('resource-create-submit-btn').click();
      await expect(page.getByTestId('resource-create-form')).toContainText(
        'http:// or https://',
      );

      await page
        .getByTestId('resource-url-input')
        .fill('https://supabase.com/docs/guides/realtime');
      await page.getByTestId('resource-category-select').selectOption('docs');
      await page.getByTestId('resource-create-submit-btn').click();

      const createdRes = page
        .locator('[data-testid^="resource-item-"]')
        .filter({ hasText: resourceTitle });
      await expect(createdRes).toBeVisible({ timeout: 15000 });
      const resAttr = await createdRes.getAttribute('data-testid');
      createdResourceId = resAttr ? resAttr.replace('resource-item-', '') : null;
      expect(createdResourceId).toBeTruthy();

      await page
        .getByTestId(`resource-delete-btn-${createdResourceId}`)
        .click();
      await page
        .getByTestId(`resource-delete-confirm-btn-${createdResourceId}`)
        .click();
      await expect(
        page.getByTestId(`resource-item-${createdResourceId}`),
      ).toHaveCount(0, { timeout: 15000 });
      createdResourceId = null;

      await closeWorkstationDrawer(page);
      assertNoErrors();
    } finally {
      if (briefModified) {
        try {
          if (await page.getByTestId('overview-edit-btn').isVisible()) {
            await page.getByTestId('overview-edit-btn').click();
          }
          if (await page.getByTestId('overview-description-input').isVisible()) {
            await page
              .getByTestId('overview-description-input')
              .fill(PROJECT_OVERVIEW_ORIGINAL.description);
            await page.getByTestId('overview-save-btn').click();
          }
        } catch {
          // Best-effort brief restore.
        }
      }
      if (createdResourceId) {
        try {
          const delBtn = page.getByTestId(
            `resource-delete-btn-${createdResourceId}`,
          );
          if (await delBtn.isVisible()) {
            await delBtn.click();
            await page
              .getByTestId(`resource-delete-confirm-btn-${createdResourceId}`)
              .click();
          }
        } catch {
          // Best-effort cleanup.
        }
      }
    }
  });

  test('M9 4th Workstation Team Whiteboard (sketch + sticky note) persists and syncs live', async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const noteText = `E2E Sticky ${Date.now()}`;
    let createdNoteId: string | null = null;
    let strokeAdded = false;
    let pageA: Page | null = null;

    try {
      pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      const assertNoErrorsA = trackRuntimeErrors(pageA);
      const assertNoErrorsB = trackRuntimeErrors(pageB);

      await Promise.all([
        signInAsDemoAndEnterStudio(pageA, 'team_lead', 'IF-4031'),
        signInAsDemoAndEnterStudio(pageB, 'member', 'IF-4031'),
      ]);

      await expect(pageA.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );
      await expect(pageB.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );

      // Nadia opens the 4th workstation via keyboard [E] near north chalkboard.
      const teleported = await pageA.evaluate(
        () =>
          window.__LEARNNEXUS_GAME__?.teleportToWorkstation('whiteboard') ??
          false,
      );
      expect(teleported).toBe(true);
      await expect(pageA.getByTestId('workstation-prompt')).toContainText(
        'Open Team Whiteboard',
      );
      await pageA.getByTestId('phaser-canvas-container').focus();
      await pageA.keyboard.press('KeyE');

      await expect(pageA.getByTestId('whiteboard-panel')).toBeVisible({
        timeout: 15000,
      });

      // Bima also opens the whiteboard drawer.
      await openWorkstationDrawer(pageB, 'whiteboard');
      await expect(pageB.getByTestId('whiteboard-panel')).toBeVisible({
        timeout: 15000,
      });

      // Nadia draws a stroke on the shared canvas.
      await pageA.getByTestId('whiteboard-color-4A6B46').click();
      await pageA.getByTestId('whiteboard-width-4').click();
      const canvas = pageA.getByTestId('whiteboard-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        await pageA.mouse.move(box.x + 40, box.y + 40);
        await pageA.mouse.down();
        await pageA.mouse.move(box.x + 120, box.y + 90);
        await pageA.mouse.move(box.x + 180, box.y + 70);
        await pageA.mouse.up();
        strokeAdded = true;
      }

      await expect(pageA.getByTestId('whiteboard-panel')).toContainText(
        '1 stroke',
        { timeout: 15000 },
      );
      await expect(pageB.getByTestId('whiteboard-panel')).toContainText(
        '1 stroke',
        { timeout: 20000 },
      );

      // Nadia posts a sticky note -> Bima sees it live.
      await pageA.getByTestId('whiteboard-note-input').fill(noteText);
      await pageA.getByTestId('whiteboard-note-color-lavender').click();
      await pageA.getByTestId('whiteboard-note-submit-btn').click();

      const noteCardA = pageA
        .locator('[data-testid^="whiteboard-note-item-"]')
        .filter({ hasText: noteText });
      await expect(noteCardA).toBeVisible({ timeout: 15000 });
      const noteAttr = await noteCardA.getAttribute('data-testid');
      createdNoteId = noteAttr
        ? noteAttr.replace('whiteboard-note-item-', '')
        : null;
      expect(createdNoteId).toBeTruthy();

      await expect(
        pageB.getByTestId(`whiteboard-note-item-${createdNoteId}`),
      ).toBeVisible({ timeout: 20000 });

      // Reload pageA and verify both stroke and sticky note persisted in Postgres.
      await pageA.reload();
      await expect(pageA.locator('h1')).toHaveText('Team Workspace Studio', {
        timeout: 15000,
      });
      await waitForGameReady(pageA);
      await openWorkstationDrawer(pageA, 'whiteboard');
      await expect(pageA.getByTestId('whiteboard-panel')).toContainText(
        '1 stroke',
        { timeout: 15000 },
      );
      await expect(
        pageA.getByTestId(`whiteboard-note-item-${createdNoteId}`),
      ).toBeVisible({ timeout: 15000 });

      // Clean up stroke and sticky note so seeded board stays deterministic.
      await pageA.getByTestId('whiteboard-undo-btn').click();
      await expect(pageA.getByTestId('whiteboard-panel')).toContainText(
        '0 strokes',
        { timeout: 15000 },
      );
      strokeAdded = false;

      await pageA
        .getByTestId(`whiteboard-note-delete-btn-${createdNoteId}`)
        .click();
      await pageA
        .getByTestId(`whiteboard-note-delete-confirm-btn-${createdNoteId}`)
        .click();
      await expect(
        pageA.getByTestId(`whiteboard-note-item-${createdNoteId}`),
      ).toHaveCount(0, { timeout: 15000 });
      createdNoteId = null;

      assertNoErrorsA();
      assertNoErrorsB();
    } finally {
      if (pageA && strokeAdded) {
        try {
          if (await pageA.getByTestId('whiteboard-undo-btn').isEnabled()) {
            await pageA.getByTestId('whiteboard-undo-btn').click();
          }
        } catch {
          // Best-effort stroke cleanup.
        }
      }
      if (pageA && createdNoteId) {
        try {
          const delBtn = pageA.getByTestId(
            `whiteboard-note-delete-btn-${createdNoteId}`,
          );
          if (await delBtn.isVisible()) {
            await delBtn.click();
            await pageA
              .getByTestId(`whiteboard-note-delete-confirm-btn-${createdNoteId}`)
              .click();
          }
        } catch {
          // Best-effort note cleanup.
        }
      }
      await contextA.close();
      await contextB.close();
    }
  });
});
