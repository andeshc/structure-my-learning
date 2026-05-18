# ── Stage 1: build the React client ──────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /build

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# ── Stage 2: production server ────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Production server deps only (no vitest / supertest)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/

# Express serves the client from ../../client/dist relative to server/src/
COPY --from=client-builder /build/client/dist ./client/dist

# Ensure volume mount points exist
RUN mkdir -p /data /app/server/public/generated

EXPOSE 3001
CMD ["node", "/app/server/src/index.js"]
