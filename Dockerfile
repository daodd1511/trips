# syntax=docker/dockerfile:1

# Build: install everything and compile the web app into dist/.
FROM oven/bun:1.2.21 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime: the server runs from source with only its own dependencies (hono, zod).
# Bundling the server is avoided: it breaks hono/bun's serveStatic.
FROM oven/bun:1.2.21-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist
# The host directory mounted at /data must be writable by this user (uid 1000).
RUN mkdir -p /data && chown bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "server/index.ts"]
