FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN npm i prisma tsx typescript

COPY . .

RUN npx prisma generate

CMD npx prisma migrate deploy && npx tsx src/server.ts
