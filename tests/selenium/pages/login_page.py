from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LoginPage(BasePage):
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email'], input#email")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='senha'], input#senha")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")
    LOGIN_LINK = (By.LINK_TEXT, "Entrar")

    def navigate(self):
        self.driver.get(f"{self.base_url}/login")
        return self

    def login(self, email, password):
        self.navigate()
        self.wait_for_element(*self.EMAIL_INPUT).send_keys(email)
        self.wait_for_element(*self.PASSWORD_INPUT).send_keys(password)
        self.wait_for_clickable(*self.SUBMIT_BUTTON).click()
        # Wait for the SPA redirect away from /login (React Router, no full reload).
        self.wait_for_url_not_contains("login", timeout=10)
        # Alternative: wait for AppShell elements
        try:
            self.wait_for_visible(By.TAG_NAME, "header", timeout=8)
        except:
            pass
        return self
