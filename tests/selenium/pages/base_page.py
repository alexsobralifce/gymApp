import os
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "screenshots")


class BasePage:
    def __init__(self, driver, base_url="https://www.endorfinapp.com.br"):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    def wait_for_element(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )

    def wait_for_clickable(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((by, value))
        )

    def wait_for_visible(self, by, value, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located((by, value))
        )

    def wait_for_url_contains(self, text, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.url_contains(text)
        )

    def wait_for_url_not_contains(self, text, timeout=10):
        """Wait until the URL no longer contains `text` (e.g. after a login redirect)."""
        return WebDriverWait(self.driver, timeout).until(
            lambda d: text not in (d.current_url or "")
        )

    def capture_screenshot(self, name):
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)
        path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
        self.driver.save_screenshot(path)
        return path

    def check_no_js_errors(self):
        """Check browser console for SEVERE errors. Returns list of error messages."""
        logs = self.driver.get_log("browser")
        errors = [entry["message"] for entry in logs if entry.get("level") == "SEVERE"]
        return errors
