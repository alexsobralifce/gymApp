# Guia de Deploy no Railway — GymApp

Este guia explica o passo a passo para colocar a aplicação **GymApp** (monorepo contendo Backend API e Frontend Web) em produção utilizando o **Railway**.

---

## 0. Otimizações de Build (Railway Config)

Dois arquivos `railway.json` foram adicionados para acelerar deploys. **Nota (2026-09-29):** no serviço `api` em produção o Root Directory é a raiz do repo, então `apps/api/railway.json` não é lido; watch paths, build e start valem os do painel:

### Watch Paths
- `apps/api/railway.json` → muda algo em `apps/api/**`? **Só rebuilda a API**
- `apps/web/railway.json` → muda algo em `apps/web/**`? **Só rebuilda o Web**
- Mudanças em ambos? Ambos rebuildam. Mudanças na raiz? Ambos rebuildam.

### Healthcheck
```json
"healthcheckPath": "/health",
"healthcheckTimeout": 60
```
A API expõe `GET /health` que retorna `{ status: "ok" }`. O Railway monitora esse endpoint e só considera o deploy saudável quando recebe 200.

### O que mais acelera
| Otimização | Impacto |
|---|---|
| **Watch paths** | Evita rebuild desnecessário (ex: mudar frontend não rebuilda backend) |
| **Healthcheck rápido (60s)** | Deploy confirmado em 1 minuto, não 5 minutos |
| **Railpack builder** | Cache de dependências entre deploys |
| **railway-start.sh** | Sinc de exercícios em background, server inicia em segundos |

---

## 1. Pré-requisitos
1. Uma conta no [Railway](https://railway.app).
2. O código do projeto commitado e enviado para um repositório no **GitHub**.

---

## 2. Passo 1: Criar Bancos de Dados no Railway

No painel do seu projeto no Railway:

### A. Criar PostgreSQL
1. Clique em **+ New** > **Database** > **Add PostgreSQL**.
2. O Railway criará uma instância do PostgreSQL e definirá automaticamente a variável de ambiente `DATABASE_URL`.

### B. Criar Redis
1. Clique em **+ New** > **Database** > **Add Redis**.
2. O Railway criará uma instância do Redis e definirá automaticamente a variável de ambiente `REDIS_URL`.

---

## 3. Passo 2: Implantar o Backend API (`apps/api`)

1. No seu projeto do Railway, clique em **+ New** > **GitHub Repo** e selecione o repositório do **GymApp**.
2. Uma vez criado o serviço, clique nele e vá em **Settings**:
   - Renomeie o serviço para `gymapp-api` ou `api` para melhor organização.
   - **Root Directory**: vazio (raiz do repositório). O monorepo é buildado inteiro e o processo roda com `cwd=/app`.
   - **Start Command** (configurado no painel, é a fonte de verdade em produção):
     ```
     npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && (npx tsx apps/api/prisma/sync-gifdotreino.ts && npx tsx apps/api/prisma/translate-exercises.ts && npx tsx apps/api/prisma/seed-planos.ts) & node apps/api/dist/server.js
     ```
   - **Volume**: `api-volume` montado em `/app/public/uploads` (avatares, feed e logos das academias). Como o `cwd` é `/app`, `public/uploads` da API resolve para esse mount.
   - **Atenção**: `apps/api/railway.json` e `apps/api/railway-start.sh` **não são usados** por este serviço (o Railway só lê `railway.json` na raiz do Root Directory). Mudanças de build/start devem ser feitas no painel.
   - **Rodar scripts em produção** (ex.: seed): sempre com `cd /app`, por exemplo `railway ssh --service api -- "cd /app && npx tsx apps/api/prisma/seed-academia-demo.ts"`. Rodar de `/app/apps/api` grava arquivos fora do volume.

3. Vá para a aba **Variables** e adicione as seguintes variáveis de ambiente:
   - `PORT`: (Gerada automaticamente pelo Railway).
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Isso vincula a URL do serviço de banco do PostgreSQL criado no Passo 2).
   - `REDIS_URL`: `${{Redis.REDIS_URL}}` (Isso vincula a URL do serviço Redis criado no Passo 2).
   - `NODE_ENV`: `production`
   - `API_BASE_URL`: A URL gerada pelo Railway para esta API (ex: `https://gymapp-api-production.up.railway.app`).
   - `JWT_SECRET`: Um segredo forte com mais de 32 caracteres (ex: gerar via `openssl rand -base64 32`).
   - `JWT_REFRESH_SECRET`: Outro segredo forte com mais de 32 caracteres.
   - `JWT_EXPIRES_IN`: `15m`
   - `JWT_REFRESH_EXPIRES_IN`: `7d`
   - *Se utilizar Push Notifications e Storage, adicione também:*
     - `VAPID_PUBLIC_KEY`
     - `VAPID_PRIVATE_KEY`
     - `VAPID_SUBJECT`
     - `STORAGE_BUCKET`
     - `STORAGE_ENDPOINT`
     - `STORAGE_REGION`
     - `STORAGE_ACCESS_KEY`
     - `STORAGE_SECRET_KEY`

4. Na aba **Settings**, em **Networking**, clique em **Generate Domain** para gerar uma URL pública para a sua API. Use essa URL para preencher a variável `API_BASE_URL` do Backend e a variável correspondente do Frontend.

---

## 4. Passo 3: Implantar o Frontend Web App (`apps/web`)

1. Clique em **+ New** > **GitHub Repo** e selecione o mesmo repositório do **GymApp**.
2. Renomeie o serviço para `gymapp-web` ou `web`.
3. Vá em **Settings** e configure:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start` (isso executará `npx serve -s dist -l $PORT` que adicionamos ao `package.json` para servir o SPA).
4. Vá em **Variables** e adicione:
   - `VITE_API_URL`: A URL pública gerada no backend no Passo 3 (ex: `https://gymapp-api-production.up.railway.app`).
5. Gere um domínio em **Settings** > **Networking** > **Generate Domain** para acessar a aplicação pelo navegador!

---

## 5. Como Salvar Migrações no Banco de Dados local para Produção
Como o `.gitignore` foi ajustado para parar de ignorar a pasta `apps/api/prisma/migrations/`, as migrações locais agora são rastreadas pelo Git. 

Sempre que você criar uma nova migração localmente com:
```bash
npm run db:migrate --workspace=apps/api
```
Ela gerará arquivos na pasta `prisma/migrations`. Lembre-se de **comitar** essa pasta e subir para o GitHub antes do deploy para que o Railway possa executar o comando `npx prisma migrate deploy` com sucesso.
