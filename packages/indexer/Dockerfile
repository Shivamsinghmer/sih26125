# The event indexer, as a container.
#
#   docker compose build indexer      # from the repository root
#
# A long-running process that watches the chain and writes what it sees, so
# unlike the console there is nothing to compile — it runs from TypeScript
# source under Bun, exactly as `pnpm --filter @sih26125/indexer start` does.
#
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/*

# Bun rather than Node because the workspace uses Node's ESM convention of
# importing "./x.js" from "./x.ts". Bun resolves that; Node does not, with or
# without type stripping.
ENV BUN_INSTALL=/usr/local
RUN curl -fsSL https://bun.sh/install | bash

RUN corepack enable

WORKDIR /repo

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

# The event ABIs come from Hardhat's compile output, which is git-ignored and so
# never in the build context.
RUN pnpm --filter @sih26125/contracts build

# db:push creates the tables and is safe to re-run, so it belongs with the start
# rather than as a step someone has to remember. Restarting repairs the index —
# the indexer backfills from block zero — which is the whole reason this is not
# a migration story.
#
# --force auto-approves, because a container has no terminal to answer a prompt
# on. It is only safe because drizzle.config.ts scopes the push to the indexer's
# own tables; read the comment there before removing either half.
CMD ["sh", "-c", "pnpm --filter @sih26125/indexer exec drizzle-kit push --force && pnpm --filter @sih26125/indexer start"]
