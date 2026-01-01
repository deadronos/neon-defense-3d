
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the app (assuming Vite runs on 5173 by default)
        try:
            await page.goto("http://localhost:3001")
        except Exception as e:
            print(f"Failed to load page: {e}")
            await browser.close()
            return

        # Wait for the game to load (TopBar visible)
        try:
            # Check if we are on Idle Screen and click Initiate
            initiate_btn = page.get_by_text("INITIATE")
            if await initiate_btn.is_visible():
                await initiate_btn.click()

            # Check for the speed controls we added
            await expect(page.get_by_text("1x")).to_be_visible(timeout=10000)
            await expect(page.get_by_text("2x")).to_be_visible()
            await expect(page.get_by_text("4x")).to_be_visible()

            # Click on 2x
            await page.get_by_text("2x").click()

            # Take a screenshot
            await page.screenshot(path="verification/speed_controls.png")
            print("Screenshot taken: verification/speed_controls.png")

        except Exception as e:
            print(f"Verification failed: {e}")
            await page.screenshot(path="verification/error.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
