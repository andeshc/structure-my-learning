# ── Stage 1: build the React client ──────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /build

COPY package*.json ./
COPY client/package.json ./client/
RUN npm ci --workspace=client

COPY client/ ./client/
RUN cd client && npm run build

# ── Stage 2: production server ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Use root workspace lock file — server has no standalone package-lock.json
COPY package*.json ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --omit=dev

COPY server/ ./server/

# Express serves the client from ../../client/dist relative to server/src/
COPY --from=client-builder /build/client/dist ./client/dist

# Ensure volume mount points exist
RUN mkdir -p /data /app/server/public/generated

EXPOSE 3001
CMD ["node", "/app/server/src/index.js"]
