import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials


class TestProfessor:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("PROFESSOR")
        if not email or not password:
            pytest.skip("PROFESSOR credentials not set")
        return email, password

    def test_login_and_navigation(self, driver, base_url, creds):
        email, password = creds
        page = LoginPage(driver, base_url)
        
        try:
            page.login(email, password)
            
            assert "/login" not in driver.current_url
            page.wait_for_visible(By.TAG_NAME, "header", timeout=8)
            
            # Dashboard should show student list or stats
            body = driver.find_element(By.TAG_NAME, "body")
            assert len(body.text) > 50
            
            # Navigate: Treinos
            driver.get(f"{base_url}/treinos")
            page.wait_for_url_contains("treinos", timeout=8)
            
            # Navigate: Meus Treinos (self-workouts)
            driver.get(f"{base_url}/meus-treinos")
            page.wait_for_url_contains("meus-treinos", timeout=8)
            
            # Navigate: Academias
            driver.get(f"{base_url}/academias")
            page.wait_for_url_contains("academias", timeout=8)
            
            # JS errors
            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS console errors: {errors}"
            
            # Header check
            assert len(driver.find_elements(By.TAG_NAME, "header")) > 0
            
            # Logout
            driver.get(f"{base_url}/login")
            
        except Exception:
            page.capture_screenshot("test_professor_failure")
            raise
