# syntax=docker/dockerfile:1

# ─────────────── Stage 1: build ───────────────
FROM node:24-alpine AS builder

# Ferramentas para compilar módulos nativos (argon2).
RUN corepack enable && apk add --no-cache python3 make g++

WORKDIR /app

# Instala dependências com cache eficiente (lock + workspace = allowBuilds).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Gera o Prisma Client e compila o TypeScript.
COPY . .
RUN pnpm prisma generate && pnpm run build

# ─────────────── Stage 2: runtime ───────────────
FROM node:24-alpine AS runner

# tini: init mínimo para repassar sinais (shutdown limpo).
RUN apk add --no-cache tini

WORKDIR /app
ENV NODE_ENV=production

# Copia apenas o necessário do builder (node_modules já com nativos compilados
# e Prisma Client gerado; prisma CLI presente para `migrate deploy`).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Roda como usuário sem privilégios.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000

# Healthcheck bate no /health (Node 24 tem fetch global).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000,x=process.env.API_PREFIX||'api';fetch('http://127.0.0.1:'+p+'/'+x+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Aplica migrations pendentes e sobe a API.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
