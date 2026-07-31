import pytest
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials
import time


class TestProfessor:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("PROFESSOR")
        if not email or not password:
            pytest.skip("PROFESSOR credentials not set")
        return email, password

    def test_login_and_dashboard(self, driver, base_url, creds):
        """RF-03: Login + dashboard do professor com lista de alunos."""
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
            page.capture_screenshot("professor_dashboard_failure")
            raise

    def test_treinos_for_students(self, driver, base_url, creds):
        """RF-04: Listagem de treinos para alunos."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/treinos", timeout=8)

        assert "treinos" in driver.current_url
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_meus_treinos_self_workouts(self, driver, base_url, creds):
        """Self-treino (feature nova): professor visualiza seus treinos próprios."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/meus-treinos", timeout=8)

        assert "meus-treinos" in driver.current_url
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_criar_treino_page(self, driver, base_url, creds):
        """RF-04: Página de criação de treino carrega (exige seleção de aluno)."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/treinos/criar", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_fichas_templates(self, driver, base_url, creds):
        """RF-04: Fichas/templates de treino."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/fichas", timeout=8)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 20

        errors = page.check_no_js_errors()
        assert len(errors) == 0, f"JS errors: {errors}"

    def test_academias_list(self, driver, base_url, creds):
        """Navegação para listagem de academias."""
        email, password = creds
        page = LoginPage(driver, base_url)
        page.login(email, password)

        page.navigate_to("/academias", timeout=8)

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
