import { expect, test, type Page, type Route } from '@playwright/test';
import {
  signInAsDemoAndEnterStudio,
  waitForGameReady,
} from './helpers/authFlow';

const PERSISTENCE_TASK_ID = '55555555-5555-4555-8555-555555555503';
const REPO_RESOURCE_ID = '66666666-6666-4666-8666-666666666601';
const INJECTED_HTTP_500_LOG =
  'Failed to load resource: the server responded with a status of 500';

function trackErrors(
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

async function openWorkstationPanel(
  page: Page,
  workstationId: 'overview' | 'tasks' | 'resources',
): Promise<void> {
  const teleported = await page.evaluate(
    (wsId) => window.__LEARNNEXUS_GAME__?.teleportToWorkstation(wsId) ?? false,
    workstationId,
  );
  expect(teleported, `teleportToWorkstation("${workstationId}") failed`).toBe(
    true,
  );

  const prompt = page.getByTestId('workstation-prompt');
  await expect(prompt).toBeVisible();
  await prompt.click();

  const drawer = page.getByTestId('workstation-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute('data-workstation-id', workstationId);
}

async function closeWorkstationPanel(page: Page): Promise<void> {
  await page.getByTestId('close-drawer-btn').click();
  await expect(page.getByTestId('workstation-drawer')).toBeHidden();
}

async function fulfillSimulated500(
  route: Route,
  expectedMethod: 'GET' | 'PATCH',
  message: string,
): Promise<void> {
  if (route.request().method() !== expectedMethod) {
    await route.continue();
    return;
  }

  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({
      message,
      code: '57014',
    }),
  });
}

test.describe('M3 Persistence, Cross-Session Isolation, and Error Resilience', () => {
  test('Clean browser session and cross-user persistence (Nadia -> Bima -> Nadia)', async ({
    browser,
  }) => {
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    try {
      const page1 = await context1.newPage();
      const assertNoErrors1 = trackErrors(page1);

      await signInAsDemoAndEnterStudio(page1, 'team_lead', 'IF-4031');
      await openWorkstationPanel(page1, 'tasks');

      const select1 = page1.getByTestId(
        `task-status-select-${PERSISTENCE_TASK_ID}`,
      );
      await expect(select1).toBeVisible({ timeout: 15000 });
      await expect(select1).toHaveValue('todo');

      await select1.selectOption('in_progress');
      await expect(page1.getByTestId('tasks-save-indicator')).toContainText(
        'All changes saved',
        { timeout: 15000 },
      );
      await expect(select1).toHaveValue('in_progress');

      assertNoErrors1();
    } finally {
      await context1.close();
    }

    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    try {
      const page2 = await context2.newPage();
      const assertNoErrors2 = trackErrors(page2);

      await page2.goto('/');
      await expect(page2.getByTestId('entry-gateway')).toBeVisible({
        timeout: 15000,
      });

      await page2.getByTestId('demo-profile-member').click();
      await page2.getByTestId('demo-enter-btn').click();

      const spaceIF4031 = page2.getByTestId('space-card-IF-4031');
      await expect(spaceIF4031).toBeVisible({ timeout: 15000 });
      await expect(page2.getByTestId('space-card-IF-3210')).toHaveCount(0);
      await expect(page2.getByTestId('header-user-badge')).toContainText(
        'Bima Santoso (Demo)',
      );

      await spaceIF4031.getByTestId('enter-studio-btn').click();
      await expect(page2.locator('h1')).toHaveText('Team Workspace Studio', {
        timeout: 15000,
      });
      await waitForGameReady(page2);

      await openWorkstationPanel(page2, 'tasks');

      const select2 = page2.getByTestId(
        `task-status-select-${PERSISTENCE_TASK_ID}`,
      );
      await expect(select2).toBeVisible({ timeout: 15000 });
      await expect(select2).toHaveValue('in_progress');

      await select2.selectOption('done');
      await expect(page2.getByTestId('tasks-save-indicator')).toContainText(
        'All changes saved',
        { timeout: 15000 },
      );
      await expect(select2).toHaveValue('done');

      assertNoErrors2();
    } finally {
      await context2.close();
    }

    const context3 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    try {
      const page3 = await context3.newPage();
      const assertNoErrors3 = trackErrors(page3);

      await signInAsDemoAndEnterStudio(page3, 'team_lead', 'IF-4031');
      await openWorkstationPanel(page3, 'tasks');

      const select3 = page3.getByTestId(
        `task-status-select-${PERSISTENCE_TASK_ID}`,
      );
      await expect(select3).toBeVisible({ timeout: 15000 });
      await expect(select3).toHaveValue('done');

      // Restore seeded status so subsequent tests start cleanly.
      await select3.selectOption('todo');
      await expect(page3.getByTestId('tasks-save-indicator')).toContainText(
        'All changes saved',
        { timeout: 15000 },
      );
      await expect(select3).toHaveValue('todo');

      assertNoErrors3();
    } finally {
      await context3.close();
    }
  });

  test('Save-failure preserves unsaved status and supports Revert and Retry save', async ({
    page,
  }) => {
    const assertNoErrors = trackErrors(page, [INJECTED_HTTP_500_LOG]);
    await page.setViewportSize({ width: 1280, height: 720 });
    await signInAsDemoAndEnterStudio(page, 'team_lead', 'IF-4031');

    await openWorkstationPanel(page, 'tasks');

    const taskCard = page.getByTestId(`task-item-${PERSISTENCE_TASK_ID}`);
    const statusSelect = page.getByTestId(
      `task-status-select-${PERSISTENCE_TASK_ID}`,
    );
    const saveIndicator = page.getByTestId('tasks-save-indicator');
    const unsavedBadge = page.getByTestId(
      `task-unsaved-badge-${PERSISTENCE_TASK_ID}`,
    );

    await expect(statusSelect).toBeVisible({ timeout: 15000 });
    await expect(statusSelect).toHaveValue('todo');

    await page.route('**/rest/v1/tasks*', (route) =>
      fulfillSimulated500(route, 'PATCH', 'Simulated database write outage'),
    );

    await statusSelect.selectOption('done');

    await expect(saveIndicator).toHaveAttribute('role', 'alert', {
      timeout: 15000,
    });
    await expect(saveIndicator).not.toContainText('All changes saved');
    await expect(unsavedBadge).toBeVisible();
    await expect(statusSelect).toHaveValue('done');
    await expect(taskCard.locator('.status-badge--todo')).toHaveText('To Do');

    await page.getByTestId(`task-revert-btn-${PERSISTENCE_TASK_ID}`).click();
    await expect(statusSelect).toHaveValue('todo');
    await expect(unsavedBadge).toBeHidden();

    await statusSelect.selectOption('done');
    await expect(saveIndicator).toHaveAttribute('role', 'alert', {
      timeout: 15000,
    });
    await expect(unsavedBadge).toBeVisible();

    await page.unroute('**/rest/v1/tasks*');
    await page.getByTestId(`task-retry-btn-${PERSISTENCE_TASK_ID}`).click();

    await expect(saveIndicator).toContainText('All changes saved', {
      timeout: 15000,
    });
    await expect(unsavedBadge).toBeHidden();
    await expect(statusSelect).toHaveValue('done');

    await page.reload();
    await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    await openWorkstationPanel(page, 'tasks');
    const reloadedSelect = page.getByTestId(
      `task-status-select-${PERSISTENCE_TASK_ID}`,
    );
    await expect(reloadedSelect).toBeVisible({ timeout: 15000 });
    await expect(reloadedSelect).toHaveValue('done');

    await reloadedSelect.selectOption('todo');
    await expect(page.getByTestId('tasks-save-indicator')).toContainText(
      'All changes saved',
      { timeout: 15000 },
    );
    await expect(reloadedSelect).toHaveValue('todo');

    assertNoErrors();
  });

  test('Fetch-failure shows honest error state and recovers on Retry across Spaces, Overview, Tasks, and Resources', async ({
    page,
  }) => {
    const assertNoErrors = trackErrors(page, [INJECTED_HTTP_500_LOG]);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    await expect(page.getByTestId('entry-gateway')).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId('demo-profile-team_lead').click();

    await page.route('**/rest/v1/class*', (route) =>
      fulfillSimulated500(route, 'GET', 'Simulated academic spaces outage'),
    );

    await page.getByTestId('demo-enter-btn').click();
    await expect(page.getByTestId('spaces-error-banner')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('space-card-IF-4031')).toHaveCount(0);

    await page.unroute('**/rest/v1/class*');
    await page.getByTestId('spaces-retry-btn').click();

    const spaceCard = page.getByTestId('space-card-IF-4031');
    await expect(spaceCard).toBeVisible({ timeout: 15000 });
    await spaceCard.getByTestId('enter-studio-btn').click();

    await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
      timeout: 15000,
    });
    await waitForGameReady(page);

    await page.route('**/rest/v1/projects*', (route) =>
      fulfillSimulated500(route, 'GET', 'Simulated project overview outage'),
    );
    await openWorkstationPanel(page, 'overview');

    const overviewPanel = page.getByTestId('project-overview-panel');
    await expect(overviewPanel).toContainText(
      'Could not load project overview',
      { timeout: 15000 },
    );

    await page.unroute('**/rest/v1/projects*');
    await overviewPanel.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByTestId('project-title')).toHaveText(
      'LearnNexus Semifinal Demonstrator',
      { timeout: 15000 },
    );
    await closeWorkstationPanel(page);

    await page.route('**/rest/v1/tasks*', (route) =>
      fulfillSimulated500(route, 'GET', 'Simulated sprint tasks outage'),
    );
    await openWorkstationPanel(page, 'tasks');

    const tasksPanel = page.getByTestId('tasks-sprint-panel');
    await expect(tasksPanel).toContainText('Could not load sprint tasks', {
      timeout: 15000,
    });

    await page.unroute('**/rest/v1/tasks*');
    await tasksPanel.getByRole('button', { name: 'Retry' }).click();
    await expect(
      page.getByTestId(`task-item-${PERSISTENCE_TASK_ID}`),
    ).toBeVisible({ timeout: 15000 });
    await closeWorkstationPanel(page);

    await page.route('**/rest/v1/resources*', (route) =>
      fulfillSimulated500(route, 'GET', 'Simulated resource library outage'),
    );
    await openWorkstationPanel(page, 'resources');

    const resourcePanel = page.getByTestId('resource-library-panel');
    await expect(resourcePanel).toContainText('Could not load resources', {
      timeout: 15000,
    });

    await page.unroute('**/rest/v1/resources*');
    await resourcePanel.getByRole('button', { name: 'Retry' }).click();

    const repoLink = page.getByTestId(`resource-open-link-${REPO_RESOURCE_ID}`);
    await expect(repoLink).toBeVisible({ timeout: 15000 });
    await expect(repoLink).toHaveAttribute(
      'href',
      'https://github.com/edgiaxel/LearnNexus',
    );
    await closeWorkstationPanel(page);

    assertNoErrors();
  });

  test('Displays workspace layout metadata, Demo Data badge, and supports in-panel Refresh', async ({
    page,
  }) => {
    const assertNoErrors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await signInAsDemoAndEnterStudio(page, 'team_lead', 'IF-4031');

    const layoutMeta = page.getByTestId('workspace-layout-meta');
    await expect(layoutMeta).toBeVisible({ timeout: 15000 });
    await expect(layoutMeta).toContainText('campus_studio_v1', {
      timeout: 15000,
    });

    await openWorkstationPanel(page, 'overview');
    await expect(page.getByTestId('project-title')).toHaveText(
      'LearnNexus Semifinal Demonstrator',
      { timeout: 15000 },
    );
    await expect(page.getByTestId('demo-data-badge')).toBeVisible();
    await expect(page.getByTestId('demo-data-badge')).toContainText(
      'Seeded Demo Data',
    );
    const overviewRefreshBtn = page.getByTestId('panel-refresh-btn');
    await expect(overviewRefreshBtn).toBeVisible();
    const [overviewRefreshRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/rest/v1/projects') &&
          res.request().method() === 'GET' &&
          res.status() === 200,
      ),
      overviewRefreshBtn.click(),
    ]);
    expect(overviewRefreshRes.ok()).toBe(true);
    await expect(page.getByTestId('project-title')).toHaveText(
      'LearnNexus Semifinal Demonstrator',
      { timeout: 15000 },
    );
    await closeWorkstationPanel(page);

    await openWorkstationPanel(page, 'tasks');
    await expect(
      page.getByTestId(`task-item-${PERSISTENCE_TASK_ID}`),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('demo-data-badge')).toBeVisible();
    await expect(page.getByTestId('demo-data-badge')).toContainText(
      'Seeded Demo Data',
    );
    const tasksRefreshBtn = page.getByTestId('panel-refresh-btn');
    await expect(tasksRefreshBtn).toBeVisible();
    const [tasksRefreshRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/rest/v1/tasks') &&
          res.request().method() === 'GET' &&
          res.status() === 200,
      ),
      tasksRefreshBtn.click(),
    ]);
    expect(tasksRefreshRes.ok()).toBe(true);
    await expect(
      page.getByTestId(`task-item-${PERSISTENCE_TASK_ID}`),
    ).toBeVisible({ timeout: 15000 });
    await closeWorkstationPanel(page);

    await openWorkstationPanel(page, 'resources');
    const repoLink = page.getByTestId(`resource-open-link-${REPO_RESOURCE_ID}`);
    await expect(repoLink).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('demo-data-badge')).toBeVisible();
    await expect(page.getByTestId('demo-data-badge')).toContainText(
      'Seeded Demo Data',
    );
    const resourcesRefreshBtn = page.getByTestId('panel-refresh-btn');
    await expect(resourcesRefreshBtn).toBeVisible();
    const [resourcesRefreshRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/rest/v1/resources') &&
          res.request().method() === 'GET' &&
          res.status() === 200,
      ),
      resourcesRefreshBtn.click(),
    ]);
    expect(resourcesRefreshRes.ok()).toBe(true);
    await expect(repoLink).toBeVisible({ timeout: 15000 });
    await closeWorkstationPanel(page);

    assertNoErrors();
  });
});
