"""Teste de início e fim de treino — verifica registro sem duplicação."""
import pytest
import time
import requests
from pages.login_page import LoginPage
from selenium.webdriver.common.by import By
from conftest import get_credentials

ALUNO = "teste.aluno@endorfinapp.com"
TREINO_ID = "cmsdi25q7000lobgac911uh43"
API_BASE = "https://api-production-3360.up.railway.app"


def api_headers(token):
    return {"Authorization": f"Bearer {token}"}


def login_api():
    """Login via API e retorna accessToken."""
    r = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": ALUNO, "senha": "Teste@123"},
    )
    r.raise_for_status()
    return r.json()["accessToken"]


def count_posts(token, treino_id, tipo=None):
    """Conta posts do mural para um treino específico (e tipo opcional)."""
    posts = []
    params = {"limit": 20}
    r = requests.get(f"{API_BASE}/social/mural", headers=api_headers(token), params=params)
    r.raise_for_status()
    data = r.json()
    items = data.get("items", data) if isinstance(data, dict) else data
    for p in items:
        if isinstance(p, dict) and p.get("treino_id") == treino_id:
            if tipo is None or p.get("tipo") == tipo:
                posts.append(p)
    return posts


class TestTreinoExecucao:
    @pytest.fixture(autouse=True)
    def creds(self):
        email, password = get_credentials("ALUNO")
        if not email or not password:
            pytest.skip("ALUNO credentials not set")
        return email, password

    @pytest.fixture(autouse=True)
    def api_token(self):
        return login_api()

    def test_iniciar_finalizar_sem_duplicacao(self, driver, base_url, creds, api_token):
        """Inicia um treino, registra série, finaliza — verifica zero duplicação."""
        email, password = creds

        # ── 0. Estado inicial ──
        posts_antes = count_posts(api_token, TREINO_ID)
        num_iniciado_antes = len([p for p in posts_antes if p["tipo"] == "TREINO_INICIADO"])
        num_concluido_antes = len([p for p in posts_antes if p["tipo"] == "TREINO_CONCLUIDO"])

        # ── 1. Login via navegador ──
        page = LoginPage(driver, base_url)
        page.login(email, password)
        time.sleep(2)

        # Dismiss onboarding popups & coach marks via localStorage
        driver.execute_script("""
            localStorage.setItem('gymapp_onboarding_seen', 'true');
            localStorage.setItem('gymapp_welcome_seen', 'true');
            localStorage.setItem('gymapp_first_workout_done', 'true');
        """)
        # Recarregar para aplicar o localStorage (remove overlays)
        driver.get(f"{base_url}/meus-treinos")
        time.sleep(2)

        # ── 2. Navegar para o treino e iniciar ──
        driver.get(f"{base_url}/treino/{TREINO_ID}/inicio")
        time.sleep(2)

        # Clicar "Comecar Treino"
        iniciar_btn = page.wait_for_clickable(By.XPATH, "//button[contains(.,'Comecar Treino')]", timeout=8)
        iniciar_btn.click()
        time.sleep(3)  # aguarda navegação + carregamento da execução

        # Assert navegou para execucao
        assert f"/treino/{TREINO_ID}/execucao" in driver.current_url, (
            f"Não navegou para execucao: {driver.current_url}"
        )

        # Assert timer visível (treino EM_EXECUCAO)
        timer_el = driver.find_elements(By.XPATH, "//*[contains(text(),'Finalizar Treino')]")
        assert len(timer_el) > 0, "Tela de execução não carregou (botão Finalizar não encontrado)"

        # ── 3. Verificar status via API ──
        r = requests.get(
            f"{API_BASE}/treinos/{TREINO_ID}",
            headers=api_headers(api_token),
        )
        r.raise_for_status()
        treino = r.json()
        assert treino.get("status") == "EM_EXECUCAO", f"Status esperado EM_EXECUCAO, recebido {treino.get('status')}"
        assert treino.get("iniciado_em") is not None, "iniciado_em deveria estar preenchido"

        # ── 4. Registrar uma série (primeiro exercício, série 1) ──
        # Preencher carga e reps, depois clicar no botão ✓ da primeira série
        series_btn = page.wait_for_clickable(
            By.XPATH,
            "//button[contains(@class,'bg-primary') and contains(@class,'text-primary-foreground') and contains(.,'✓')]",
            timeout=5,
        )
        series_btn.click()
        time.sleep(1.5)

        # ── 5. Finalizar o treino ──
        finalizar_btn = page.wait_for_clickable(
            By.XPATH, "//button[contains(.,'Finalizar Treino')]", timeout=8
        )
        finalizar_btn.click()
        time.sleep(1.5)

        # Escolher dificuldade "Moderado" (ou qualquer opção visível)
        opcoes = driver.find_elements(By.XPATH, "//button[contains(.,'Moderado')]")
        if opcoes:
            opcoes[0].click()
        else:
            # fallback: clicar "Pular avaliação"
            pular = driver.find_elements(By.XPATH, "//button[contains(.,'Pular avaliação')]")
            if pular:
                pular[0].click()
        time.sleep(3)  # aguarda navegação para conclusao

        # Assert conclusão
        assert "/conclusao" in driver.current_url, f"Não navegou para conclusao: {driver.current_url}"
        conclusao_text = driver.find_element(By.TAG_NAME, "body").text
        assert "Treino Concluído" in conclusao_text, f"Tela de conclusão não apareceu: {conclusao_text[:100]}"

        # ── 6. Verificar sem duplicação (posts) ──
        time.sleep(2)  # aguarda worker fanout processar
        posts_depois = count_posts(api_token, TREINO_ID)
        num_iniciado_depois = len([p for p in posts_depois if p["tipo"] == "TREINO_INICIADO"])
        num_concluido_depois = len([p for p in posts_depois if p["tipo"] == "TREINO_CONCLUIDO"])

        assert num_iniciado_depois == num_iniciado_antes + 1, (
            f"Esperado exatamente +1 TREINO_INICIADO. Antes: {num_iniciado_antes}, depois: {num_iniciado_depois}"
        )
        assert num_concluido_depois == num_concluido_antes + 1, (
            f"Esperado exatamente +1 TREINO_CONCLUIDO. Antes: {num_concluido_antes}, depois: {num_concluido_depois}"
        )

        # Verificar que o treino foi reciclado (status ACEITO após finalizar)
        r2 = requests.get(
            f"{API_BASE}/treinos/{TREINO_ID}",
            headers=api_headers(api_token),
        )
        r2.raise_for_status()
        treino2 = r2.json()
        assert treino2.get("status") == "ACEITO", (
            f"Após finalizar, treino deveria estar ACEITO (reciclado), mas está {treino2.get('status')}"
        )
        assert treino2.get("finalizado_em") is None, (
            "finalizado_em deve ser null após reciclagem para ACEITO"
        )

        print(f"✅ Verificação concluída: {num_iniciado_depois} TREINO_INICIADO, {num_concluido_depois} TREINO_CONCLUIDO — sem duplicação")
