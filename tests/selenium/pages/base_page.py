import os
import time
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

    def navigate_to(self, path, timeout=10):
        """Full-page navigation to a route, waiting for the SPA to finish booting.

        The app shows a "Carregando..." screen until the session is restored, so the
        AppShell header (present on every authenticated page) is used as the signal
        that the app finished loading.
        """
        self.driver.get(f"{self.base_url}{path}")
        self.wait_for_url_contains(path, timeout=timeout)
        self.wait_for_visible(By.TAG_NAME, "header", timeout=timeout)
        return self

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

    def logout(self, timeout=10):
        """Real logout via the AppShell user menu: click avatar in the top bar, then 'Sair'.

        handleLogout() in AppShell clears the auth state and sets window.location.href = '/',
        so this waits until the AppShell header (with the avatar) is gone after the reload.
        """
        self._dismiss_popups()
        avatar = WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH, "//header//div[contains(@class,'relative')]//button"))
        )
        avatar.click()
        sair = WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space(.)='Sair']"))
        )
        sair.click()
        WebDriverWait(self.driver, timeout).until(
            EC.invisibility_of_element_located((By.XPATH, "//header//div[contains(@class,'relative')]//button"))
        )

    def _dismiss_popups(self, timeout=5):
        """Dismiss transient overlay prompts that can intercept clicks.

        - OnboardingPopup: full-screen modal for ALUNO/PROFESSOR on first visit
          (button "Começar").
        - NotificationPrompt: bottom bar asking for push notification permission
          (button "Agora não"). It is z-50 and can cover the "Sair" menu item.

        Fast no-op when neither prompt is present. Also pre-empts both by
        setting their localStorage flags.
        """
        try:
            self.driver.execute_script(
                "localStorage.setItem('gymapp_onboarding_seen','true');"
                "localStorage.setItem('gymapp_notification_prompt','true');"
            )
        except Exception:
            pass
        dismiss_buttons = (
            (By.XPATH, "//button[normalize-space(.)='Começar']"),
            (By.XPATH, "//button[normalize-space(.)='Agora não']"),
        )
        # Temporarily disable implicit wait so presence polls are fast.
        try:
            self.driver.implicitly_wait(0)
            deadline = time.time() + timeout
            while time.time() < deadline:
                clicked = False
                for by, loc in dismiss_buttons:
                    try:
                        btn = self.driver.find_element(by, loc)
                        if btn.is_displayed():
                            btn.click()
                            clicked = True
                    except Exception:
                        pass
                if not clicked:
                    return
                time.sleep(0.3)
        finally:
            self.driver.implicitly_wait(2)
