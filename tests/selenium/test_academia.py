import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials
import time


class TestAcademia:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("ACADEMIA")
        if not email or not password:
            pytest.skip("ACADEMIA credentials not set")
        return email, password

    def test_login_and_dashboard(self, driver, base_url, creds):
        """RF-03: Login + validação do dashboard da academia."""
        email, password = creds
        page = LoginPage(driver, base_url)
        start = time.time()

        try:
            page.login(email, password)
            assert time.time() - start < 15, f"Login took {time.time()-start:.1f}s"

            assert "/login" not in driver.current_url
            page.wait_for_visible(By.TAG_NAME, "header", timeout=8)

            # Dashboard body must have content
            body_text = driver.find_element(By.TAG_NAME, "body").text
            assert len(body_text) > 50, "Dashboard appears empty"

            # Verify header exists
            headers = driver.find_elements(By.TAG_NAME, "header")
            assert len(headers) > 0, "Header not present"

            # Verify no JS errors
            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS errors: {errors}"

        except Exception:
            page.capture_screenshot("academia_dashboard_failure")
            raise

    def test_professores_list(self, driver, base_url, creds):
        """RF-14: Listagem de professores com ações de gestão."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/professores", timeout=8)

        # Verify page has content
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20, "/professores page empty"

        # Should see header
        assert len(driver.find_elements(By.TAG_NAME, "header")) > 0

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_alunos_list(self, driver, base_url, creds):
        """RF-04: Listagem de alunos e atribuição de professor."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/alunos", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20, "/alunos page empty"

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_treinos_view(self, driver, base_url, creds):
        """RF-04: Visualização de treinos da academia."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/treinos", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20, "/treinos page empty"

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_logout(self, driver, base_url, creds):
        """Valida logout real pela UI (avatar -> Sair)."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.logout()

        # After logout, /login shows the login form again (was redirecting to / when authenticated)
        driver.get(f"{base_url}/login")
        page.wait_for_visible(By.CSS_SELECTOR, "input[type='email']", timeout=8)
        assert "login" in driver.current_url, "Not on login page after logout"
