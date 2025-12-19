
from playwright.sync_api import sync_playwright

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            page.goto("http://localhost:3000")
            page.wait_for_timeout(3000)
            page.screenshot(path="verification/verification.png")
        except Exception as e:
            print(f"SCRIPT ERROR: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_visuals()
