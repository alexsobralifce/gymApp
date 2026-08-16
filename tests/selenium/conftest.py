import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "https://www.endorfinapp.com.br")


def pytest_addoption(parser):
    parser.addoption("--headless", action="store_true", default=False, help="Run headless")
    parser.addoption("--browser", default="chrome", help="Browser: chrome")


@pytest.fixture(scope="function")
def driver(request):
    opts = Options()
    if request.config.getoption("--headless"):
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,800")
    opts.add_argument("--disable-gpu")
    # Required so BasePage.check_no_js_errors() can read the browser console log.
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    service = Service(ChromeDriverManager().install())
    drv = webdriver.Chrome(service=service, options=opts)
    drv.implicitly_wait(2)
    yield drv
    drv.quit()


@pytest.fixture
def base_url():
    return BASE_URL


def get_credentials(prefix):
    """Get credentials from env vars. Returns (email, password) or (None, None)."""
    email = os.getenv(f"{prefix}_USER", "")
    password = os.getenv(f"{prefix}_PASS", "")
    if email and password:
        return email, password
    return None, None
