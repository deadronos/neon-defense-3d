
import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the game on port 3000
        await page.goto("http://localhost:3000")

        # Wait for game to load (adjust selector based on your game's loading screen or main menu)
        await page.wait_for_selector("text=Neon Defense", timeout=30000)

        # Start game
        start_btn = page.get_by_role("button", name="INITIATE")
        if await start_btn.is_visible():
            await start_btn.click(force=True)

        # Wait for game canvas
        await page.wait_for_selector("canvas", timeout=30000)

        # Click on a build menu item (Blaster)
        await page.get_by_role("button", name="Blaster").click(force=True)

        # Place it near center
        canvas = page.locator("canvas")
        box = await canvas.bounding_box()
        if box:
            # Place
            await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            await asyncio.sleep(0.5)
            # Select
            await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)

        # Check if inspector is visible
        try:
            await expect(page.get_by_text("Damage", exact=False).first).to_be_visible(timeout=5000)
            print("Inspector visible!")
        except:
            print("Inspector not found immediately")
            # Maybe click slightly off? or try again
            await asyncio.sleep(1)
            await page.screenshot(path="verification/debug_inspector.png")

        # Take screenshot of the inspector
        await page.screenshot(path="verification/inspector.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
