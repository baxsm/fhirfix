# build context is the repo root, not backend/. the shared db and engine
# packages are vendored in by scripts/sync-shared.mjs at install time, so the
# build needs the sibling directories too.
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
COPY backend ./backend
# vendors db/ and engine/ into backend/src/shared
RUN node scripts/sync-shared.mjs

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/db ./db
COPY --from=build /app/engine ./engine
COPY --from=build /app/backend ./backend

WORKDIR /app/backend
EXPOSE 3001
USER bun
# src is run directly: bun executes typescript, and the bundled output loses the
# @shared/* path mapping that the vendored packages resolve through.
CMD ["bun", "run", "src/index.ts"]
