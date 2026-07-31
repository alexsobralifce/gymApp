import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials


class TestAcademia:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("ACADEMIA")
        if not email or not password:
            pytest.skip("ACADEMIA credentials not set")
        return email, password

    def test_login_and_dashboard(self, driver, base_url, creds):
        email, password = creds
        page = LoginPage(driver, base_url)
        
        try:
            page.login(email, password)
            
            # Validate on dashboard
            assert "/login" not in driver.current_url
            page.wait_for_visible(By.TAG_NAME, "header", timeout=8)
            
            # Check body has content (dashboard stats)
            body = driver.find_element(By.TAG_NAME, "body")
            assert len(body.text) > 50, "Dashboard appears empty"
            
            # Navigate to professores
            driver.get(f"{base_url}/professores")
            page.wait_for_url_contains("professores", timeout=8)
            assert "professores" in driver.current_url
            
            # Navigate to alunos
            driver.get(f"{base_url}/alunos")
            page.wait_for_url_contains("alunos", timeout=8)
            assert "alunos" in driver.current_url
            
            # JS errors check
            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS console errors: {errors}"
            
            # Verify header present
            headers = driver.find_elements(By.TAG_NAME, "header")
            assert len(headers) > 0, "Header not found"
            
            # Logout
            driver.get(f"{base_url}/login")
            
        except Exception:
            page.capture_screenshot("test_academia_failure")
            raise
