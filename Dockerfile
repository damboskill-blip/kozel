FROM node:22-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps ./apps

RUN pnpm -F @kozel/web build

FROM node:22-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY packages ./packages
COPY apps/server/src ./apps/server/src
COPY apps/server/tsconfig.json ./apps/server/
COPY --from=build /app/apps/web/dist ./apps/web/dist

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/kozel.db

EXPOSE 8080

WORKDIR /app/apps/server
CMD ["sh", "-c", "mkdir -p /data && pnpm start"]
