# syntax=docker/dockerfile:1

# --- Stage 1: install production dependencies ---
FROM node:20-alpine AS builder
WORKDIR /app

# copy manifest files first
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# -- stage 2: minimal runtime image ---
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# copy only what the app needs
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

# run as non-root for security
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
