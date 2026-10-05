# Continuidade: SEO, blog e robô de curadoria (2026-10-05)

Nota para retomar o trabalho em outra conta/sessão. Tudo abaixo está **commitado localmente**; o último push
foi o commit `4d09874` (IndexNow + scripts de indexação). Ver `git log origin/main..HEAD` para o que falta enviar.

## Já em produção (https://endorfinapp.com.br)
- Busca sem acento + `BarraBusca` nas listas (academia, professor, clubes).
- SEO: `useSeo`, `robots.txt`/`sitemap.xml` gerados no build, JSON-LD, pré-render (`scripts/prerender.mjs`),
  `serve.json` (404 real) e redirect `www` → raiz (regra na Cloudflare).
- Páginas de produto: `/app-para-personal-trainer`, `/software-para-academia`, `/app-de-treino`.
- Blog: `/blog` e primeiro artigo publicado. Artigos publicados = `apps/web/content/blog/*.json`;
  rascunhos = `apps/web/content/blog-rascunhos/` (não vão para o site).
- Avisos a buscadores: IndexNow ativo; workflow `.github/workflows/avisar-buscadores.yml`.
- Login Google com o cliente OAuth novo (`728341668157-…`), já em api/web no Railway.

## Local, ainda NÃO enviado (commits `c57f79a` + o commit de troca para OpenAI)
Robô de curadoria semanal, em `apps/web/scripts/curadoria/`:
- `fontes.json`: 10 feeds (BR/EUA/UK), janela de 14 dias, palavras positivas/negativas.
- `rss.mjs`, `selecao.mjs`: parser RSS e ranking (funções puras, testadas em `src/curadoria.test.ts`).
- `redator.mjs`: **agora usa a OpenAI** (Chat Completions + saída JSON estrita, via `fetch`, sem SDK).
  Modelo padrão `gpt-4.1` (troque com a variável `CURADORIA_MODELO`). Travas: descrição 100–160 caracteres,
  título diferente, sem 7 palavras copiadas do original, `relevante=false` descarta.
- `curadoria.mjs`: orquestra. `--dry` só lista os candidatos (não precisa de chave). Sem `--dry`, exige `OPENAI_API_KEY`.
- Workflow `.github/workflows/curadoria-semanal.yml`: segunda 08h (Brasília), abre um **Pull Request**
  com 2 artigos (merge = publica). Usa o segredo `OPENAI_API_KEY` do GitHub.
- `BlogArtigo` mostra o aviso "Curadoria" com link da matéria original e `citation` no JSON-LD.

## Pendências (em ordem)
1. **Chave da OpenAI inválida**: `OPENAI_API_KEY` do serviço `api` no Railway retorna HTTP 401
   ("Incorrect API key"). Gerar uma chave nova em platform.openai.com, atualizar no Railway e criar o
   segredo `OPENAI_API_KEY` no GitHub (Settings > Secrets and variables > Actions). O robô nunca rodou de verdade.
2. Testar de ponta a ponta: `cd apps/web && OPENAI_API_KEY=... node scripts/curadoria/curadoria.mjs --quantidade=1`
   e revisar o JSON gerado em `content/blog/` (confirmar que o modelo escolhido existe na conta).
3. Fazer o push dos commits locais (dispara deploy no Railway) e rodar o workflow manualmente em Actions.
4. Conta de serviço do Google (`GOOGLE_SERVICE_ACCOUNT_JSON`) para `scripts/avisar-buscadores.mjs`
   e `scripts/status-indexacao.mjs` (envio de sitemap e monitor de indexação).
5. Search Console: verificar a propriedade (arquivo `googledca835bfffe82f52.html` já no ar), enviar `sitemap.xml`.
6. Ideias discutidas: páginas públicas de exercícios (963 exercícios com GIF), calculadoras, capa por artigo,
   sumário, RSS do blog.

## Atenção
- Arquivos NÃO relacionados e não commitados (do usuário): `TrialCartaoStep.tsx`, `src/utils/valorPorAluno*`,
  `docs/planning/integracao-huawei-health-kit.md`, `imagens_blog/`, mudanças em `.opencode/` e `.gitignore`.
  Sempre `git add` com caminhos explícitos (um `git add apps/web/src` já pegou arquivos alheios uma vez).
- Segredos ficam só em `apps/api/.env` (ignorado pelo git): `CLOUDFLARE_API_TOKEN`, `GOOGLE_CLIENT_*`.
  O `client_secret_*.json` da raiz está no `.gitignore`. Nunca pôr chave em `.env.example`.
- Antes de push/redeploy em produção, confirmar com o usuário.
- Rota nova do app precisa entrar em `apps/web/public/serve.json` (há teste que avisa).
