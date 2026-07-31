# Selenium Test Suite — Endorfinapp

Testes automatizados de UI para o sistema Endorfinapp (https://www.endorfinapp.com.br) usando Selenium WebDriver + pytest + Page Object Model.

## Pré-requisitos

- Python 3.10+
- Google Chrome instalado
- `pip install -r requirements.txt`

## Configuração de credenciais

1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Preencha as credenciais no `.env`:
   - `ACADEMIA_USER/PASS` — conta de gestor de academia
   - `PROFESSOR_USER/PASS` — conta de professor
   - `ALUNO_USER/PASS` — conta de aluno
   - `ROOT_USER/PASS` — conta de admin (opcional; teste é pulado se vazio)

3. O arquivo `.env` **não é versionado** (está no `.gitignore`).

## Executando os testes

```bash
# Todos os testes (visível)
pytest tests/selenium/ -v

# Somente um perfil
pytest tests/selenium/test_aluno.py -v

# Modo headless (CI/CD)
pytest tests/selenium/ -v --headless

# Com relatório de falhas
pytest tests/selenium/ -v --tb=short
```

## Estrutura

```
tests/selenium/
├── conftest.py           # Fixtures do Selenium e carregamento .env
├── pages/
│   ├── base_page.py      # Base Page Object (waits, screenshots, JS errors)
│   └── login_page.py     # Login page
├── test_aluno.py         # Cenário ALUNO
├── test_professor.py     # Cenário PROFESSOR
├── test_academia.py      # Cenário ACADEMIA
├── test_root.py          # Cenário ROOT (pulado se credenciais vazias)
├── .env.example          # Template de credenciais
├── .env                  # Credenciais reais (não versionado)
├── .gitignore
├── requirements.txt
└── README.md
```

## Screenshots de falha

Em caso de erro, screenshots são salvos em `tests/selenium/screenshots/`.

## Perfis testados

| Perfil | Login | Navegação testada |
|---|---|---|
| ROOT | Painel admin | /vinculos, /usuarios |
| ACADEMIA | Dashboard | /professores, /alunos |
| PROFESSOR | Dashboard | /treinos, /meus-treinos, /academias |
| ALUNO | Dashboard | /meus-treinos, /evolucao, /medidas |
