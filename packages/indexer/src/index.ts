/**
 * The event indexer.
 *
 *   pnpm --filter @sih26125/indexer db:push   # create the tables
 *   pnpm --filter @sih26125/indexer start
 *
 * A long-running process, not a request handler — it watches the chain
 * continuously and writes what it sees. That is why it lives outside the Next.js
 * app rather than inside an API route.
 *
 * It backfills from block zero on every start, which is deliberate: replaying is
 * cheap on a permissioned chain that produces tens of thousands of events a day,
 * and it means a corrupted or deleted index is repaired by restarting rather
 * than by a migration. The chain remains the only source of truth.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createPublicClient, http, parseEventLogs, type Address } from "viem";
import { hardhat } from "viem/chains";

import { assetTokenAbi, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";

import { assets, chainEvents, identities, indexerState, roleGrants } from "./schema.js";
import {
  apply,
  emptyProjection,
  toIndexedEvent,
  type ContractName,
  type IndexedEvent,
  type Projection,
  type RawLog,
} from "./transform.js";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/sih26125";
const POLL_MS = Number(process.env.POLL_MS ?? 4000);

const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

const deployment = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../deployments/localhost.json", import.meta.url)),
    "utf8",
  ),
) as { contracts: Record<string, Address> };

const SOURCES: { name: ContractName; address: Address; abi: readonly unknown[] }[] = [
  {
    name: "IdentityRegistry",
    address: deployment.contracts.IdentityRegistry!,
    abi: identityRegistryAbi,
  },
  { name: "RoleRegistry", address: deployment.contracts.RoleRegistry!, abi: roleRegistryAbi },
  { name: "AssetToken", address: deployment.contracts.AssetToken!, abi: assetTokenAbi },
];

const blockTimes = new Map<bigint, number>();

async function timestampFor(blockNumber: bigint): Promise<number> {
  const cached = blockTimes.get(blockNumber);
  if (cached !== undefined) return cached;
  const block = await publicClient.getBlock({ blockNumber });
  blockTimes.set(blockNumber, Number(block.timestamp));
  return Number(block.timestamp);
}

async function collect(fromBlock: bigint, toBlock: bigint): Promise<IndexedEvent[]> {
  const events: IndexedEvent[] = [];

  for (const source of SOURCES) {
    const rawLogs = await publicClient.getLogs({
      address: source.address,
      fromBlock,
      toBlock,
    });
    const parsed = parseEventLogs({
      abi: source.abi as never,
      logs: rawLogs as never,
    }) as unknown as RawLog[];

    for (const log of parsed) {
      const timestamp = await timestampFor(log.blockNumber ?? 0n);
      const event = toIndexedEvent(log, source.name, timestamp);
      if (event) events.push(event);
    }
  }

  return events.sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? a.logIndex - b.logIndex
      : a.blockNumber - b.blockNumber,
  );
}

async function persist(events: IndexedEvent[], projection: Projection) {
  if (events.length > 0) {
    await db
      .insert(chainEvents)
      .values(events)
      // Re-seeing a log on a restart must not duplicate it.
      .onConflictDoNothing();
  }

  for (const identity of projection.identities.values()) {
    await db
      .insert(identities)
      .values(identity)
      .onConflictDoUpdate({ target: identities.account, set: identity });
  }

  for (const grant of projection.roleGrants.values()) {
    await db
      .insert(roleGrants)
      .values(grant)
      .onConflictDoUpdate({ target: [roleGrants.account, roleGrants.role], set: grant });
  }

  for (const asset of projection.assets.values()) {
    await db
      .insert(assets)
      .values(asset)
      .onConflictDoUpdate({ target: assets.tokenId, set: asset });
  }
}

async function main() {
  console.log(`indexer → ${RPC_URL}`);
  console.log(`         ${DATABASE_URL.replace(/:\/\/[^@]+@/, "://***@")}`);

  const projection = emptyProjection();
  let cursor = 0n;

  for (;;) {
    try {
      const head = await publicClient.getBlockNumber();

      if (head >= cursor) {
        const events = await collect(cursor, head);
        for (const event of events) apply(projection, event);
        await persist(events, projection);

        await db
          .insert(indexerState)
          .values({ id: 1, lastBlock: Number(head), updatedAt: new Date() })
          .onConflictDoUpdate({
            target: indexerState.id,
            set: { lastBlock: Number(head), updatedAt: new Date() },
          });

        if (events.length > 0) {
          console.log(
            `indexed ${events.length} event(s) up to block ${head} — ` +
              `${projection.assets.size} asset(s), ${projection.roleGrants.size} grant(s)`,
          );
        }
        cursor = head + 1n;
      }
    } catch (error) {
      // A chain restart resets block numbers, so fall back to a full replay
      // rather than sitting on a cursor that no longer means anything.
      console.error(
        `indexer: ${error instanceof Error ? error.message : "unknown error"} — replaying from 0`,
      );
      cursor = 0n;
      blockTimes.clear();
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

void main();
