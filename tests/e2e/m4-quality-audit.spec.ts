import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  signInAsDemoAndEnterStudio,
  waitForGameReady,
} from './helpers/authFlow';

const EM_DASH = String.fromCodePoint(0x2014);

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

async function tabToLocator(
  page: Page,
  locator: Locator,
  maxTabs = 35,
): Promise<void> {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab');
    const isFocused = await locator.evaluate(
      (el) => document.activeElement === el,
    );
    if (isFocused) {
      return;
    }
  }
  throw new Error(`Could not focus target locator within ${maxTabs} Tab steps`);
}

async function expectVisibleFocusIndicator(locator: Locator): Promise<void> {
  const focusStyles = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      isActive: document.activeElement === el,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });

  expect(focusStyles.isActive).toBe(true);
  const hasVisibleOutline =
    focusStyles.outlineStyle !== 'none' && focusStyles.outlineWidth !== '0px';
  const hasBoxShadow = focusStyles.boxShadow !== 'none';
  expect(
    hasVisibleOutline || hasBoxShadow,
    `Expected visible focus indicator, got outlineStyle=${focusStyles.outlineStyle} outlineWidth=${focusStyles.outlineWidth} boxShadow=${focusStyles.boxShadow}`,
  ).toBe(true);
}

async function expectPointerCursor(locator: Locator): Promise<void> {
  const cursor = await locator.evaluate(
    (el) => window.getComputedStyle(el).cursor,
  );
  expect(cursor).toBe('pointer');
}

async function assertCleanLayoutAndAntislop(
  page: Page,
  expectedInnerWidth: number,
): Promise<void> {
  const snapshot = await page.evaluate((emDash) => {
    const bodyText = document.body.innerText;
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasEmDash: bodyText.includes(emDash),
      animatedSkeletonCount: document.querySelectorAll(
        '.animate-pulse, .animate-bounce',
      ).length,
    };
  }, EM_DASH);

  expect(snapshot.innerWidth).toBe(expectedInnerWidth);
  expect(snapshot.scrollWidth).toBeLessThanOrEqual(snapshot.innerWidth);
  expect(snapshot.hasEmDash).toBe(false);
  expect(snapshot.animatedSkeletonCount).toBe(0);
}

test.describe('M4 Quality Audit, Lazy Isolation, Accessibility, and Safety', () => {
  test('isolates Phaser chunk before studio entry and verifies dist bundle chunks and secret scan', async ({
    page,
  }) => {
    const assertNoErrors = trackRuntimeErrors(page);
    const requestUrls: string[] = [];

    page.on('request', (req) => {
      requestUrls.push(req.url());
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const entryGateway = page.getByTestId('entry-gateway');
    await expect(entryGateway).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toHaveCount(0);

    await page.getByTestId('demo-profile-team_lead').click();
    await page.getByTestId('demo-enter-btn').click();

    const spaceCard = page.getByTestId('space-card-IF-4031');
    await expect(spaceCard).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toHaveCount(0);

    const phaserRequestsBeforeEntry = requestUrls.filter((url) =>
      /\/PhaserHost|vendor-phaser|\/phaser(\.js|\?|$)/i.test(url),
    );
    expect(
      phaserRequestsBeforeEntry,
      `Phaser assets must not load before Enter Studio: ${phaserRequestsBeforeEntry.join(', ')}`,
    ).toEqual([]);

    await spaceCard.getByTestId('enter-studio-btn').click();
    await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
      timeout: 15000,
    });

    const gameState = await waitForGameReady(page);
    expect(gameState.ready).toBe(true);
    expect(gameState.pixelArt).toBe(true);
    expect(gameState.antialias).toBe(false);
    expect(gameState.roundPixels).toBe(true);
    await expect(
      page.locator('[data-testid="phaser-canvas-container"] canvas'),
    ).toHaveCount(1);

    const distAssetsDir = path.resolve(process.cwd(), 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      const jsFiles = files.filter((file) => file.endsWith('.js'));

      expect(
        jsFiles.some((file) => /^vendor-phaser-.*\.js$/.test(file)),
        'Expected vendor-phaser chunk in dist/assets',
      ).toBe(true);
      expect(
        jsFiles.some((file) => /^vendor-supabase-.*\.js$/.test(file)),
        'Expected vendor-supabase chunk in dist/assets',
      ).toBe(true);
      expect(
        jsFiles.some((file) => /^vendor-react-.*\.js$/.test(file)),
        'Expected vendor-react chunk in dist/assets',
      ).toBe(true);
      expect(
        jsFiles.some((file) => /^PhaserHost-.*\.js$/.test(file)),
        'Expected lazy PhaserHost chunk in dist/assets',
      ).toBe(true);

      for (const jsFile of jsFiles) {
        const content = fs.readFileSync(
          path.join(distAssetsDir, jsFile),
          'utf8',
        );
        expect(
          /eyJpZCI6|service_role|sbp_/.test(content),
          `Detected disallowed secret pattern in dist/assets/${jsFile}`,
        ).toBe(false);
      }
    }

    assertNoErrors();
  });

  test('delivers two-way live Studio Chat and avatar bubbles between Nadia and Bima', async ({
    browser,
  }) => {
    const contextNadia = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const contextBima = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    try {
      const pageNadia = await contextNadia.newPage();
      const pageBima = await contextBima.newPage();
      const assertNoErrorsNadia = trackRuntimeErrors(pageNadia);
      const assertNoErrorsBima = trackRuntimeErrors(pageBima);

      await Promise.all([
        signInAsDemoAndEnterStudio(pageNadia, 'team_lead', 'IF-4031'),
        signInAsDemoAndEnterStudio(pageBima, 'member', 'IF-4031'),
      ]);

      await expect(pageNadia.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );
      await expect(pageBima.getByTestId('realtime-status-badge')).toHaveText(
        'Live sync',
        { timeout: 20000 },
      );

      await expect(
        pageNadia.getByTestId('online-teammates-btn'),
      ).toContainText('Online (2)', { timeout: 20000 });
      await expect(pageBima.getByTestId('online-teammates-btn')).toContainText(
        'Online (2)',
        { timeout: 20000 },
      );

      await expect
        .poll(
          () =>
            pageNadia.evaluate(
              () => window.__LEARNNEXUS_GAME__?.getState().remotePlayerCount ?? 0,
            ),
          { timeout: 15000 },
        )
        .toBe(1);
      await expect
        .poll(
          () =>
            pageBima.evaluate(
              () => window.__LEARNNEXUS_GAME__?.getState().remotePlayerCount ?? 0,
            ),
          { timeout: 15000 },
        )
        .toBe(1);

      const stamp = Date.now();
      const msgFromNadia = `M4 live chat check A ${stamp}`;
      const msgFromBima = `M4 live chat check B ${stamp}`;

      await pageNadia.getByTestId('studio-chat-toggle').click();
      await expect(pageNadia.getByTestId('studio-chat-panel')).toBeVisible();
      await pageNadia.getByTestId('studio-chat-input').fill(msgFromNadia);
      await pageNadia.getByTestId('studio-chat-send-btn').click();
      await expect(pageNadia.getByTestId('studio-chat-list')).toContainText(
        msgFromNadia,
        { timeout: 15000 },
      );

      await expect(
        pageBima.getByTestId('studio-chat-unread-badge'),
      ).toBeVisible({ timeout: 15000 });
      await expect
        .poll(
          () =>
            pageBima.evaluate(
              () =>
                window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ??
                0,
            ),
          { timeout: 15000 },
        )
        .toBeGreaterThanOrEqual(1);

      await pageBima.getByTestId('studio-chat-toggle').click();
      await expect(pageBima.getByTestId('studio-chat-panel')).toBeVisible();
      await expect(pageBima.getByTestId('studio-chat-list')).toContainText(
        msgFromNadia,
        { timeout: 15000 },
      );

      await pageBima.getByTestId('studio-chat-input').fill(msgFromBima);
      await pageBima.getByTestId('studio-chat-send-btn').click();
      await expect(pageBima.getByTestId('studio-chat-list')).toContainText(
        msgFromBima,
        { timeout: 15000 },
      );

      await expect(pageNadia.getByTestId('studio-chat-list')).toContainText(
        msgFromBima,
        { timeout: 15000 },
      );
      await expect
        .poll(
          () =>
            pageNadia.evaluate(
              () =>
                window.__LEARNNEXUS_GAME__?.getState().activeChatBubbleCount ??
                0,
            ),
          { timeout: 15000 },
        )
        .toBeGreaterThanOrEqual(1);

      assertNoErrorsNadia();
      assertNoErrorsBima();
    } finally {
      await contextNadia.close();
      await contextBima.close();
    }
  });

  test('supports full keyboard navigation, visible focus styles, pointer cursors, and Escape focus restoration', async ({
    page,
  }) => {
    const assertNoErrors = trackRuntimeErrors(page);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByTestId('entry-gateway')).toBeVisible({
      timeout: 15000,
    });

    const demoEnterBtn = page.getByTestId('demo-enter-btn');
    await expectPointerCursor(demoEnterBtn);

    const teamLeadBtn = page.getByTestId('demo-profile-team_lead');
    await tabToLocator(page, teamLeadBtn);
    await expectVisibleFocusIndicator(teamLeadBtn);
    await page.keyboard.press('Enter');

    await tabToLocator(page, demoEnterBtn);
    await expectVisibleFocusIndicator(demoEnterBtn);

    const emailInput = page.getByTestId('email-input');
    await tabToLocator(page, emailInput);
    await expectVisibleFocusIndicator(emailInput);

    await page.keyboard.press('Shift+Tab');
    await expectVisibleFocusIndicator(demoEnterBtn);
    await page.keyboard.press('Enter');

    const spaceCard = page.getByTestId('space-card-IF-4031');
    await expect(spaceCard).toBeVisible({ timeout: 15000 });
    const enterStudioBtn = spaceCard.getByTestId('enter-studio-btn');
    await expectPointerCursor(enterStudioBtn);

    await tabToLocator(page, enterStudioBtn);
    await expectVisibleFocusIndicator(enterStudioBtn);
    await page.keyboard.press('Enter');

    await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    const onlineBtn = page.getByTestId('online-teammates-btn');
    const chatToggleBtn = page.getByTestId('studio-chat-toggle');
    await expectPointerCursor(onlineBtn);
    await expectPointerCursor(chatToggleBtn);

    await tabToLocator(page, onlineBtn);
    await expectVisibleFocusIndicator(onlineBtn);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('online-teammates-list')).toBeVisible();
    await tabToLocator(page, page.getByLabel('Close online teammates'), 5);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('online-teammates-list')).toBeHidden();
    await expect(onlineBtn).toBeFocused();

    await tabToLocator(page, chatToggleBtn);
    await expectVisibleFocusIndicator(chatToggleBtn);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('studio-chat-panel')).toBeVisible();

    const chatInput = page.getByTestId('studio-chat-input');
    await tabToLocator(page, chatInput);
    await expectVisibleFocusIndicator(chatInput);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('studio-chat-panel')).toBeHidden();
    await expect(chatToggleBtn).toBeFocused();

    const canvasContainer = page.getByTestId('phaser-canvas-container');
    await tabToLocator(page, canvasContainer, 10);
    await expect(canvasContainer).toBeFocused();

    const teleported = await page.evaluate(
      () =>
        window.__LEARNNEXUS_GAME__?.teleportToWorkstation('overview') ?? false,
    );
    expect(teleported).toBe(true);

    const promptBtn = page.getByTestId('workstation-prompt');
    await expect(promptBtn).toBeVisible({ timeout: 10000 });
    await expectPointerCursor(promptBtn);

    await canvasContainer.focus();
    await page.keyboard.press('KeyE');

    const drawer = page.getByTestId('workstation-drawer');
    await expect(drawer).toBeVisible({ timeout: 10000 });
    await expect(drawer).toHaveAttribute('data-workstation-id', 'overview');

    const closeBtn = page.getByTestId('close-drawer-btn');
    await expect(closeBtn).toBeFocused();
    await expectPointerCursor(closeBtn);

    await page.keyboard.press('Tab');
    const focusInsideDrawer = await drawer.evaluate((el) =>
      el.contains(document.activeElement),
    );
    expect(focusInsideDrawer).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(canvasContainer).toBeFocused();

    assertNoErrors();
  });

  test('prevents horizontal overflow, antislop patterns, and unsafe resource links across viewports', async ({
    page,
  }) => {
    const assertNoErrors = trackRuntimeErrors(page);
    const viewports = [
      { width: 1280, height: 720 },
      { width: 1024, height: 700 },
      { width: 390, height: 844 },
    ] as const;

    await page.setViewportSize(viewports[0]);
    await page.goto('/');
    await expect(page.getByTestId('entry-gateway')).toBeVisible({
      timeout: 15000,
    });
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await assertCleanLayoutAndAntislop(page, vp.width);
    }

    await page.setViewportSize(viewports[0]);
    await page.getByTestId('demo-profile-team_lead').click();
    await page.getByTestId('demo-enter-btn').click();
    await expect(page.getByTestId('academic-spaces-directory')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('space-card-IF-4031')).toBeVisible({
      timeout: 15000,
    });
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await assertCleanLayoutAndAntislop(page, vp.width);
    }

    await page.setViewportSize(viewports[0]);
    await page
      .getByTestId('space-card-IF-4031')
      .getByTestId('enter-studio-btn')
      .click();
    await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await expect
        .poll(() => page.evaluate(() => window.innerWidth), { timeout: 5000 })
        .toBe(vp.width);
      await assertCleanLayoutAndAntislop(page, vp.width);
    }

    await page.setViewportSize(viewports[0]);
    const teleported = await page.evaluate(
      () =>
        window.__LEARNNEXUS_GAME__?.teleportToWorkstation('resources') ?? false,
    );
    expect(teleported).toBe(true);
    await expect(page.getByTestId('workstation-prompt')).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId('workstation-prompt').click();

    await expect(page.getByTestId('resource-library-panel')).toBeVisible({
      timeout: 15000,
    });
    const resourceLinks = page.locator('[data-testid^="resource-open-link-"]');
    await expect(resourceLinks.first()).toBeVisible({ timeout: 15000 });
    const linkCount = await resourceLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    for (let i = 0; i < linkCount; i += 1) {
      const link = resourceLinks.nth(i);
      const href = await link.getAttribute('href');
      const rel = await link.getAttribute('rel');
      expect(href, 'Resource link href must use http:// or https://').toMatch(
        /^https?:\/\//i,
      );
      expect(rel ?? '', 'Resource link rel must include noopener').toContain(
        'noopener',
      );
    }

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await assertCleanLayoutAndAntislop(page, vp.width);
    }

    await page.getByTestId('close-drawer-btn').click();
    await expect(page.getByTestId('workstation-drawer')).toBeHidden();

    assertNoErrors();
  });
});
