# build context is the repo root. see backend/Dockerfile for why.
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY db/package.json ./db/
COPY engine/package.json ./engine/
COPY backend/package.json ./backend/
COPY worker/package.json ./worker/
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY scripts ./scripts
COPY db ./db
COPY engine ./engine
COPY worker ./worker
RUN node scripts/sync-shared.mjs

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/db ./db
COPY --from=build /app/engine ./engine
COPY --from=build /app/worker ./worker

WORKDIR /app/worker
USER bun
# the worker is a queue consumer with no http surface, so there is no port and
# no healthcheck. liveness is observable through its logs.
CMD ["bun", "run", "src/index.ts"]
