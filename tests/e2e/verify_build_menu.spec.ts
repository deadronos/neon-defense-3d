import { test, expect } from '@playwright/test';

test('verify build menu', async ({ page }) => {
  await page.goto('/');

  // Click INITIATE to start game
  await page.getByText('INITIATE').click({ force: true });

  // Wait for game to load/start
  await page.waitForTimeout(2000);

  // Find the Basic Tower button (Pulse Cannon)
  // Code: `Select ${name}, Cost ${cost}` e.g. "Select Pulse Cannon, Cost 50"
  // Note: No $ symbol in the aria-label
  const basicTower = page.getByRole('button', { name: /select pulse cannon, cost 50/i });
  await expect(basicTower).toBeVisible();

  // Hover to show tooltip
  await basicTower.hover();
  await page.waitForTimeout(1000); // Wait for tooltip transition

  // Take screenshot
  await page.screenshot({ path: 'verification/build_menu.png' });
});
