import { expect, type Page } from '@playwright/test';
import type { DemoProfileKey } from '../../../src/types/contracts';
import type { LearnNexusGameState } from '../../../src/types/gameDebug';

export async function waitForGameReady(
  page: Page,
): Promise<LearnNexusGameState> {
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

export async function signInAsDemoAndEnterStudio(
  page: Page,
  demoKey: DemoProfileKey = 'team_lead',
  courseCode = 'IF-4031',
): Promise<LearnNexusGameState> {
  await page.goto('/');

  const entryGateway = page.getByTestId('entry-gateway');
  await expect(entryGateway).toBeVisible({ timeout: 15000 });

  await page.getByTestId(`demo-profile-${demoKey}`).click();
  await page.getByTestId('demo-enter-btn').click();

  const spaceCard = page.getByTestId(`space-card-${courseCode}`);
  await expect(spaceCard).toBeVisible({ timeout: 15000 });
  await spaceCard.getByTestId('enter-studio-btn').click();

  await expect(page.locator('h1')).toHaveText('Team Workspace Studio', {
    timeout: 15000,
  });

  return waitForGameReady(page);
}
