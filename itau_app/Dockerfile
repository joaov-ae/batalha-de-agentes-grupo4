# Node 24 executa TypeScript nativamente (type stripping), então server.ts roda sem tsx
FROM node:24-slim

WORKDIR /app

# package-lock.json garante as mesmas versões em todo build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Cloud Run injeta PORT (padrão 8080); server.ts já lê process.env.PORT
EXPOSE 8080

CMD ["node", "server.ts"]
