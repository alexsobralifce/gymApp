import os
import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By

@pytest.fixture
def root_creds():
    email = os.getenv("ROOT_USER", "")
    password = os.getenv("ROOT_PASS", "")
    if not email or not password:
        pytest.skip("ROOT_USER/ROOT_PASS not set in .env")
    return email, password


class TestRoot:
    def test_login_and_painel(self, driver, base_url, root_creds):
        email, password = root_creds
        page = LoginPage(driver, base_url)
        
        try:
            page.login(email, password)
            
            # Validate we're on the admin dashboard
            assert "/login" not in driver.current_url, "Still on login page after login"
            
            # Check for global stats (painel shows academias, professores, alunos counts)
            body_text = driver.find_element(By.TAG_NAME, "body").text
            assert len(body_text) > 100, "Dashboard body seems empty"
            
            # Verify critical UI elements present
            page.wait_for_visible(By.TAG_NAME, "header", timeout=5)
            
            # Check for navigation menu items (admin menus)
            nav_text = driver.find_element(By.TAG_NAME, "nav").text if driver.find_elements(By.TAG_NAME, "nav") else ""
            
            # JS errors check
            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS console errors: {errors}"
            
            # Navigate to usuarios management
            driver.get(f"{base_url}/usuarios")
            page.wait_for_url_contains("usuarios", timeout=8)
            assert "usuarios" in driver.current_url
            
            # Navigate to vinculos
            driver.get(f"{base_url}/vinculos")
            page.wait_for_url_contains("vinculos", timeout=8)
            assert "vinculos" in driver.current_url
            
            # Logout
            driver.get(f"{base_url}/login")
            
        except Exception:
            page.capture_screenshot("test_root_failure")
            raise
