# The console, as a container.
#
#   docker compose build web          # from the repository root
#
# Build context is the repository root, not this directory — a pnpm workspace
# install needs the lockfile and every package manifest, and the console imports
# TypeScript source straight out of packages/.
#
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder

# keccak and secp256k1 fall back to node-gyp when there is no prebuilt binary
# for this platform, and node-gyp needs a compiler. Only the builder pays for it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /repo

# Manifests first, so a source edit does not re-run the install. Every workspace
# package has to be here even though only the console is built: pnpm refuses a
# frozen-lockfile install when a package the lockfile mentions is missing.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/verifier/package.json apps/verifier/
COPY packages/chain/package.json packages/chain/
COPY packages/contracts/package.json packages/contracts/
COPY packages/custody/package.json packages/custody/
COPY packages/identity/package.json packages/identity/
COPY packages/indexer/package.json packages/indexer/

RUN pnpm install --frozen-lockfile

COPY . .

# The ABIs the console imports are Hardhat's compile output, which is git-ignored
# and therefore never in the build context — the image compiles the contracts to
# get them. That the interface is built from the same artifacts the chain runs is
# the point, so regenerating them here is right rather than merely convenient.
RUN pnpm --filter @sih26125/contracts build

# NEXT_TELEMETRY_DISABLED because a build should not phone home from a machine
# whose only job is to produce this image.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @sih26125/web build

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# `output: "standalone"` traces the files the server actually reaches and writes
# them with the workspace's shape preserved, which is why the entrypoint is
# apps/web/server.js rather than server.js. Static assets and public/ are not
# traced — they are served, not imported — so they are copied separately.
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
