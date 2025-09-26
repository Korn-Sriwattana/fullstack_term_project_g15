FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install

COPY . .

CMD ["sh", "-c", "pnpm db:push && pnpm dev"]

