# syntax=docker/dockerfile:1

# --- Étape 1 : dépendances de production uniquement ---
FROM node:24-alpine AS deps
WORKDIR /app
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Étape 2 : image finale minimale ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Version (SHA du commit) injectée par la CI, exposée par GET /health
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# Ne pas exécuter l'application en root
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

CMD ["node", "src/server.js"]
