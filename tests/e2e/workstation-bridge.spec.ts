import { expect, test, type Page } from '@playwright/test';
import { WORKSTATION_META } from '../../src/app/routerContract';
import type { WorkstationId } from '../../src/types/contracts';
import type { LearnNexusGameState } from '../../src/types/gameDebug';

function trackPageErrors(page: Page): () => void {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
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

async function getGameState(page: Page): Promise<LearnNexusGameState> {
  const state = await page.evaluate(() => window.__LEARNNEXUS_GAME__?.getState());
  if (!state) {
    throw new Error('Expected window.__LEARNNEXUS_GAME__.getState() to be defined');
  }
  return state;
}

async function waitForGameReady(page: Page): Promise<LearnNexusGameState> {
  await page.waitForFunction(
    () => window.__LEARNNEXUS_GAME__?.getState().ready === true,
    null,
    { timeout: 15000 },
  );
  return getGameState(page);
}

test.describe('Phaser-React workstation bridge and keyboard focus management', () => {
  test('moves avatar with keyboard walking and transitions to directional idle animations', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);

    const container = page.getByTestId('phaser-canvas-container');
    await container.click({ position: { x: 24, y: 24 } });
    await container.focus();
    await expect(container).toBeFocused();

    const initial = await getGameState(page);

    await page.keyboard.down('ArrowRight');
    try {
      await page.waitForTimeout(550);
    } finally {
      await page.keyboard.up('ArrowRight');
    }

    await page.waitForFunction(
      () =>
        window.__LEARNNEXUS_GAME__?.getState().activeAnim ===
        'adam_idle_anim_right',
      null,
      { timeout: 5000 },
    );

    const afterRight = await getGameState(page);
    expect(afterRight.playerTileX).toBeGreaterThan(initial.playerTileX);

    await page.keyboard.down('ArrowUp');
    try {
      await page.waitForTimeout(350);
    } finally {
      await page.keyboard.up('ArrowUp');
    }

    await page.waitForFunction(
      () =>
        window.__LEARNNEXUS_GAME__?.getState().activeAnim ===
        'adam_idle_anim_up',
      null,
      { timeout: 5000 },
    );

    const afterUp = await getGameState(page);
    expect(afterUp.playerTileY).toBeLessThan(afterRight.playerTileY);

    assertNoErrors();
  });

  test('triggers all 3 workstations via [E], locks Phaser movement while open, and restores focus on Escape', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);

    const container = page.getByTestId('phaser-canvas-container');
    const prompt = page.getByTestId('workstation-prompt');
    const drawer = page.getByTestId('workstation-drawer');
    const workstationIds: readonly WorkstationId[] = [
      'overview',
      'tasks',
      'resources',
    ];

    for (const id of workstationIds) {
      const teleported = await page.evaluate(
        (wsId) => window.__LEARNNEXUS_GAME__?.teleportToWorkstation(wsId) ?? false,
        id,
      );
      expect(teleported, `teleportToWorkstation("${id}") returned false`).toBe(
        true,
      );

      await expect(prompt).toBeVisible();
      await expect(prompt).toContainText(WORKSTATION_META[id].promptLabel);

      const beforeInteract = await getGameState(page);

      await container.focus();
      await expect(container).toBeFocused();

      await page.keyboard.down('KeyE');
      try {
        await page.waitForTimeout(60);
      } finally {
        await page.keyboard.up('KeyE');
      }

      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute('role', 'dialog');
      await expect(drawer).toContainText(WORKSTATION_META[id].title);

      await expect
        .poll(() =>
          page.evaluate(() => ({
            panelOpen: window.__LEARNNEXUS_GAME__?.getState().panelOpen ?? false,
            focusInDrawer: Boolean(
              document
                .querySelector('[data-testid="workstation-drawer"]')
                ?.contains(document.activeElement),
            ),
          })),
        )
        .toEqual({ panelOpen: true, focusInDrawer: true });

      await page.keyboard.down('ArrowRight');
      try {
        await page.waitForTimeout(250);
      } finally {
        await page.keyboard.up('ArrowRight');
      }

      const whileOpen = await getGameState(page);
      expect(whileOpen.panelOpen).toBe(true);
      expect(whileOpen.playerTileX).toBe(beforeInteract.playerTileX);
      expect(whileOpen.playerTileY).toBe(beforeInteract.playerTileY);

      await page.keyboard.press('Escape');

      await expect(drawer).toBeHidden();
      await expect(container).toBeFocused();

      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = window.__LEARNNEXUS_GAME__?.getState();
            return state
              ? {
                  panelOpen: state.panelOpen,
                  playerTileX: state.playerTileX,
                  playerTileY: state.playerTileY,
                }
              : null;
          }),
        )
        .toEqual({
          panelOpen: false,
          playerTileX: beforeInteract.playerTileX,
          playerTileY: beforeInteract.playerTileY,
        });
    }

    assertNoErrors();
  });

  test('opens workstation via pointer prompt click, traps Tab focus, and returns focus via Close button', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);

    const teleported = await page.evaluate(
      () => window.__LEARNNEXUS_GAME__?.teleportToWorkstation('tasks') ?? false,
    );
    expect(teleported).toBe(true);

    const prompt = page.getByTestId('workstation-prompt');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText(WORKSTATION_META.tasks.promptLabel);

    const cursor = await prompt.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe('pointer');

    await prompt.click();

    const drawer = page.getByTestId('workstation-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(WORKSTATION_META.tasks.title);

    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            document
              .querySelector('[data-testid="workstation-drawer"]')
              ?.contains(document.activeElement),
          ),
        ),
      )
      .toBe(true);

    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('Tab');
      const focusInsideDrawer = await page.evaluate(() => {
        const active = document.activeElement;
        const panel = document.querySelector(
          '[data-testid="workstation-drawer"]',
        );
        return Boolean(panel && active && panel.contains(active));
      });
      expect(
        focusInsideDrawer,
        `Tab press #${step + 1} moved focus outside drawer`,
      ).toBe(true);
    }

    await page.getByTestId('close-drawer-btn').click();

    await expect(drawer).toBeHidden();
    await expect(page.getByTestId('phaser-canvas-container')).toBeFocused();

    assertNoErrors();
  });
});
