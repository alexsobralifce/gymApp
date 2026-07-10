# Guia de Deploy no Railway — GymApp

Este guia explica o passo a passo para colocar a aplicação **GymApp** (monorepo contendo Backend API e Frontend Web) em produção utilizando o **Railway**.

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
   - **Root Directory**: Defina como `apps/api`.
   - **Build Command**: `npm run build` (como definimos o root directory para `apps/api`, ele rodará o build do workspace automaticamente).
   - **Start Command**: `npx prisma migrate deploy && npm run start` (isso aplicará as migrações no banco PostgreSQL antes de iniciar o servidor).

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
