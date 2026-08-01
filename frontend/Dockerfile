# build context is the repo root. see backend/Dockerfile for why.
FROM node:24-alpine AS base
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so the
# api url has to be known here, not at container start.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_GOOGLE_ENABLED=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_ENABLED=$NEXT_PUBLIC_GOOGLE_ENABLED

COPY scripts ./scripts
COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm ci
# the backend's AppRouter types are committed under src/shared/backend, so this
# builds without the backend present. sync-shared (the prebuild hook) sees no
# bun and no backend/ here and skips the refresh.
RUN npm run build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app/frontend ./frontend
WORKDIR /app/frontend
EXPOSE 3000
USER node
CMD ["npm", "run", "start"]
