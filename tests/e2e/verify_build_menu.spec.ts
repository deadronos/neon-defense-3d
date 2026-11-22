import { test, expect } from '@playwright/test';

test('verify build menu', async ({ page }) => {
  await page.goto('/');

  // Click INITIATE to start game
  await page.getByText('INITIATE').click({ force: true });

  // Wait for game to load/start
  await page.waitForTimeout(2000);

  // Find the Basic Tower button (Pulse Cannon)
  // Code: `${isSelected ? 'Deselect' : 'Select'} ${config.name}` e.g. "Select Pulse Cannon"
  const basicTower = page.getByRole('button', { name: /select pulse cannon/i });
  await expect(basicTower).toBeVisible();

  // Hover to show tooltip
  await basicTower.hover();
  await page.waitForTimeout(1000); // Wait for tooltip transition

  // Take screenshot
  await page.screenshot({ path: 'verification/build_menu.png' });
});

test('settings pauses gameplay and restores focus and speed on Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByText('INITIATE').click({ force: true });
  const fast = page.getByRole('button', { name: 'Set speed to 4x' });
  await fast.click();

  const settings = page.getByRole('button', { name: 'Open settings' });
  await settings.click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close settings' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);

  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close settings' })).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Resume game', includeHidden: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(settings).toBeFocused();
  await expect(fast).toHaveAttribute('aria-pressed', 'true');
});
