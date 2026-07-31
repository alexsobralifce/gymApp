import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials
import time


class TestAluno:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("ALUNO")
        if not email or not password:
            pytest.skip("ALUNO credentials not set")
        return email, password

    def test_login_and_dashboard(self, driver, base_url, creds):
        email, password = creds
        page = LoginPage(driver, base_url)
        start = time.time()
        
        try:
            page.login(email, password)
            load_time = time.time() - start
            
            # Load time check
            assert load_time < 5, f"Page load took {load_time:.1f}s (limit: 5s)"
            
            # Validate on dashboard
            assert "/login" not in driver.current_url
            page.wait_for_visible(By.TAG_NAME, "header", timeout=8)
            
            # Dashboard has content
            body = driver.find_element(By.TAG_NAME, "body")
            assert len(body.text) > 50, "Dashboard body seems empty"
            
            # Navigate: Meus Treinos
            driver.get(f"{base_url}/meus-treinos")
            page.wait_for_url_contains("meus-treinos", timeout=8)
            assert "meus-treinos" in driver.current_url
            
            # Navigate: Evolução
            driver.get(f"{base_url}/evolucao")
            page.wait_for_url_contains("evolucao", timeout=8)
            assert "evolucao" in driver.current_url
            
            # Navigate: Medidas
            driver.get(f"{base_url}/medidas")
            page.wait_for_url_contains("medidas", timeout=8)
            
            # JS errors
            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS console errors: {errors}"
            
            # Header check
            assert len(driver.find_elements(By.TAG_NAME, "header")) > 0
            
            # Logout
            driver.get(f"{base_url}/login")
            
        except Exception:
            page.capture_screenshot("test_aluno_failure")
            raise
