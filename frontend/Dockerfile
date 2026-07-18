# syntax=docker/dockerfile:1
# Frontend Coven Beauty (TanStack Start). Deploy separado do backend.

# ─────────────── Stage 1: build ───────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite injeta VITE_* em tempo de BUILD → passe a URL da API como build-arg no Coolify.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─────────────── Stage 2: runtime ───────────────
FROM node:24-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Só dependências de produção (React/SSR + Hono para servir).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Saída do build + servidor de produção (estáticos + SSR).
COPY --from=builder /app/dist ./dist
COPY serve.mjs ./serve.mjs

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "serve.mjs"]
