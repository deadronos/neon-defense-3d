// Manual baseline screenshot test
// Run on demand: `npm run e2e:baseline` or
// Windows: `set "CAPTURE_BASELINE=1" && npm run e2e:baseline`
import fs from 'fs';
import path from 'path';

import { test, expect } from '@playwright/test';

test.describe('Manual baseline screenshots', () => {
  test('capture welcome and first map screenshots', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:5174';

    // Ensure baseline dir exists
    const outDir = path.resolve(process.cwd(), 'docs', 'baseline');
    fs.mkdirSync(outDir, { recursive: true });

    // Log console messages from the page to the Node console
    page.on('console', (msg) => console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.error('[PAGE ERROR]', err));
    page.on('requestfailed', (req) =>
      console.warn('[REQUEST FAILED]', req.url(), req.failure()?.errorText),
    );

    // Navigate to the app and wait for initial resources to be loaded
    await page.goto(base, { waitUntil: 'networkidle' });

    // Screenshot the welcome splash
    const welcomePath = path.join(outDir, 'welcome.png');
    await page.screenshot({ path: welcomePath, fullPage: true });
    console.log(`Saved welcome screenshot: ${welcomePath}`);

    // Try to click the INITIATE button to start the game (if present)
    const initiateButton = page.getByRole('button', { name: 'INITIATE' });
    let clickedInitiate = false;
    try {
      await expect(initiateButton).toBeVisible({ timeout: 5000 });
      await initiateButton.click();
      clickedInitiate = true;
    } catch (err) {
      console.warn('INITIATE button not detected; skipping click.');
    }

    // Wait for the game UI elements to appear (top bar Sys.Integrity)
    if (clickedInitiate) {
      try {
        await page.waitForSelector('text=Sys.Integrity', { state: 'visible', timeout: 30000 });
      } catch (err) {
        console.warn('Sys.Integrity not visible after clicking INITIATE; continuing.');
      }
    }
    // Allow a small buffer for Three.js scene rendering to settle
    await page.waitForTimeout(1000);

    // Screenshot the first map
    const firstmapPath = path.join(outDir, 'firstmap.png');
    await page.screenshot({ path: firstmapPath, fullPage: true });
    console.log(`Saved firstmap screenshot: ${firstmapPath}`);
  });
});
