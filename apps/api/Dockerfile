FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm i prisma tsx typescript

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate

CMD npx prisma migrate deploy && npx tsx src/server.ts
