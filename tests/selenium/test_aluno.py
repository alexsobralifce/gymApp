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
        """RF-03: Login + painel do aluno com treinos."""
        email, password = creds
        page = LoginPage(driver, base_url)
        start = time.time()

        try:
            page.login(email, password)
            assert time.time() - start < 15, f"Login took {time.time()-start:.1f}s"

            assert "/login" not in driver.current_url
            page.wait_for_visible(By.TAG_NAME, "header", timeout=8)

            body_text = driver.find_element(By.TAG_NAME, "body").text
            assert len(body_text) > 50, "Dashboard appears empty"

            errors = page.check_no_js_errors()
            assert len(errors) == 0, f"JS errors: {errors}"

        except Exception:
            page.capture_screenshot("aluno_dashboard_failure")
            raise

    def test_meus_treinos(self, driver, base_url, creds):
        """RF-04: Visualização dos treinos do aluno."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/meus-treinos", timeout=8)

        assert "meus-treinos" in driver.current_url
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 30

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_evolucao(self, driver, base_url, creds):
        """RF-09: Dashboard de evolução mensal com gráficos."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/evolucao", timeout=8)

        assert "evolucao" in driver.current_url
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 30

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_medidas(self, driver, base_url, creds):
        """RF-17: Visualização de medidas corporais."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/medidas", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_dados_perfil(self, driver, base_url, creds):
        """RF-04: Página de dados/alteração de perfil."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/dados", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 50

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_feed_social(self, driver, base_url, creds):
        """RF-11: Feed social / mural."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/feed", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

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
