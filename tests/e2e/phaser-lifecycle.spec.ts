import { expect, test, type Page } from '@playwright/test';
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

async function waitForGameReady(page: Page): Promise<LearnNexusGameState> {
  await page.waitForFunction(
    () => window.__LEARNNEXUS_GAME__?.getState().ready === true,
    null,
    { timeout: 15000 },
  );

  const state = await page.evaluate(() => window.__LEARNNEXUS_GAME__?.getState());
  if (!state) {
    throw new Error('Expected window.__LEARNNEXUS_GAME__.getState() to be defined');
  }
  return state;
}

test.describe('Phaser M1 Studio lifecycle and ADR-012 rendering', () => {
  test('renders app shell, single canvas, Cozy tokens, accessibility basics, and live Supabase health', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);

    await expect(
      page.locator('[data-testid="phaser-canvas-container"] canvas'),
    ).toHaveCount(1);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/LearnNexus/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Team Workspace Studio');
    await expect(h1).toBeVisible();

    const bodyBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).toBe('rgb(247, 244, 236)');

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('\u2014');

    const supabaseBadge = page.locator('header [role="status"]');
    await expect(supabaseBadge).toHaveText('Supabase connected', {
      timeout: 10000,
    });
    await expect(supabaseBadge).toBeVisible();

    assertNoErrors();
  });

  test('enforces ADR-012 pixel-art sharpness on standard DPI', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    const state = await waitForGameReady(page);

    const canvas = page.locator('[data-testid="phaser-canvas-container"] canvas');
    await expect(canvas).toHaveCount(1);

    const imageRendering = await canvas.evaluate(
      (el) => getComputedStyle(el).imageRendering,
    );
    expect(['pixelated', 'crisp-edges']).toContain(imageRendering);

    expect(state.pixelArt).toBe(true);
    expect(state.antialias).toBe(false);
    expect(state.roundPixels).toBe(true);
    expect(state.tileSize).toBe(16);
    expect(state.cameraZoom).toBe(3);
    expect(Number.isInteger(state.cameraZoom)).toBe(true);

    const filterEntries = Object.entries(state.filterModes);
    expect(filterEntries.length).toBeGreaterThanOrEqual(5);
    for (const [textureKey, filterMode] of filterEntries) {
      expect(
        filterMode,
        `Expected NEAREST (1) filter mode for texture "${textureKey}"`,
      ).toBe(1);
    }

    assertNoErrors();
  });

  test('preserves ADR-012 sharpness on high-DPI (deviceScaleFactor: 2)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const assertNoErrors = trackPageErrors(page);

    try {
      await page.goto('/');
      const state = await waitForGameReady(page);

      await expect(
        page.locator('[data-testid="phaser-canvas-container"] canvas'),
      ).toHaveCount(1);

      expect(state.dpr).toBe(2);
      expect(state.cameraZoom).toBe(3);
      expect(Number.isInteger(state.cameraZoom)).toBe(true);
      expect(state.pixelArt).toBe(true);
      expect(state.antialias).toBe(false);
      expect(state.roundPixels).toBe(true);

      const filterEntries = Object.entries(state.filterModes);
      expect(filterEntries.length).toBeGreaterThanOrEqual(5);
      for (const [textureKey, filterMode] of filterEntries) {
        expect(
          filterMode,
          `Expected NEAREST (1) filter mode for high-DPI texture "${textureKey}"`,
        ).toBe(1);
      }

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

      assertNoErrors();
    } finally {
      await context.close();
    }
  });

  test('unmounts Phaser cleanly on Leave Studio and remounts single canvas on Enter Studio', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);
    await expect(
      page.locator('[data-testid="phaser-canvas-container"] canvas'),
    ).toHaveCount(1);

    await page.getByTestId('leave-studio-btn').click();

    await expect(page.locator('h1')).toHaveText('Academic Spaces');
    await expect(
      page.locator('[data-testid="phaser-canvas-container"] canvas'),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => window.__LEARNNEXUS_GAME__ === undefined),
      )
      .toBe(true);

    // Header and main both expose enter-studio-btn on the spaces view; click the main CTA explicitly.
    await page.locator('main [data-testid="enter-studio-btn"]').click();

    await waitForGameReady(page);
    await expect(page.locator('h1')).toHaveText('Team Workspace Studio');
    await expect(
      page.locator('[data-testid="phaser-canvas-container"] canvas'),
    ).toHaveCount(1);

    assertNoErrors();
  });

  test('updates integer camera zoom across desktop and mobile viewports without horizontal overflow', async ({
    page,
  }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForGameReady(page);

    const viewports = [
      { width: 1280, height: 720, expectedZoom: 3 },
      { width: 1024, height: 700, expectedZoom: 3 },
      { width: 390, height: 844, expectedZoom: 2 },
    ] as const;

    for (const { width, height, expectedZoom } of viewports) {
      await page.setViewportSize({ width, height });

      await expect(async () => {
        await expect(
          page.locator('[data-testid="phaser-canvas-container"] canvas'),
        ).toHaveCount(1);

        const snapshot = await page.evaluate(() => ({
          state: window.__LEARNNEXUS_GAME__?.getState(),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        expect(snapshot.state?.ready).toBe(true);
        expect(snapshot.state?.cameraZoom).toBe(expectedZoom);
        expect(Number.isInteger(snapshot.state?.cameraZoom)).toBe(true);
        expect(snapshot.innerWidth).toBe(width);
        expect(snapshot.scrollWidth).toBeLessThanOrEqual(snapshot.innerWidth);
      }).toPass({ timeout: 5000 });
    }

    assertNoErrors();
  });
});
