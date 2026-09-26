import { parseEventLogs, type Address, type Log } from "viem";

import { assetTokenAbi, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, roleName } from "@sih26125/identity";

import {
  loadPeople,
  personaByAddress,
  publicClient,
  readDeployment,
  shortAddress,
  type Persona,
} from "./chain";

/**
 * The auditor's replay.
 *
 * Every entry here is reconstructed from chain events alone — nothing is read
 * from an application database, because there isn't one in this path. That is
 * the claim being demonstrated: the audit record is not a log *about* the
 * transactions, it *is* the transactions, so the two can never disagree.
 *
 * Reading events directly is also why this view needs no indexer. The indexer,
 * when it exists, is a cache for querying at scale — it can be dropped and
 * rebuilt from here at any time, and is never the source of truth.
 */

export type AuditContract = "IdentityRegistry" | "RoleRegistry" | "AssetToken";

export interface AuditEntry {
  blockNumber: bigint;
  logIndex: number;
  timestamp: number;
  contract: AuditContract;
  eventName: string;
  /** A sentence an auditor can read without knowing Solidity. */
  description: string;
  transactionHash: string;
  /** Marks the moment the pitch turns on, for emphasis in the UI. */
  emphasis?: boolean;
}

const ZERO = "0x0000000000000000000000000000000000000000";

function who(people: Persona[], address?: string): string {
  if (!address) return "an unknown account";
  if (address.toLowerCase() === ZERO) return "nobody";
  return personaByAddress(people, address)?.name ?? shortAddress(address);
}

function when(expiry?: bigint): string {
  if (!expiry) return "an unspecified date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Number(expiry) * 1000));
}

function roleLabel(value: unknown): string {
  return roleName(Number(value) as Role);
}

type DecodedLog = Log & { eventName?: string; args?: Record<string, unknown> };

function describe(
  people: Persona[],
  eventName: string,
  args: Record<string, unknown>,
): { description: string; emphasis?: boolean } | null {
  switch (eventName) {
    case "IdentityRegistered":
      return {
        description: `Digital ID created for ${who(people, args.account as string)}`,
      };

    case "IdentityStatusChanged":
      return {
        description: `Digital ID status changed for ${who(people, args.account as string)}`,
      };

    case "BusinessRoleGranted":
      return {
        description: `${roleLabel(args.role)} clearance given to ${who(people, args.account as string)} by ${who(people, args.issuer as string)}, valid until ${when(args.expiry as bigint)}`,
      };

    case "BusinessRoleRevoked":
      return {
        description: `${roleLabel(args.role)} clearance taken away from ${who(people, args.account as string)} by ${who(people, args.revoker as string)}`,
        emphasis: true,
      };

    case "AssetMinted":
      return {
        description: `Item #${String(args.tokenId)} added and given to ${who(people, args.to as string)} — needs ${roleLabel(args.requiredRole)} clearance to hold`,
      };

    case "Transfer": {
      const from = args.from as string;
      const to = args.to as string;
      // The mint already has its own richer AssetMinted entry; skip the
      // zero-address Transfer that accompanies it rather than showing both.
      if (from?.toLowerCase() === ZERO) return null;
      return {
        description: `Item #${String(args.tokenId)} handed from ${who(people, from)} to ${who(people, to)}`,
        emphasis: true,
      };
    }

    // RoleGranted/RoleRevoked from OpenZeppelin AccessControl are the technical
    // roles used to deploy, not business credentials. They are noise here.
    default:
      return null;
  }
}

/**
 * Blocks per log query.
 *
 * Besu rejects any getLogs wider than --rpc-max-logs-range (200,000 on the
 * deployed network), and QBFT commits an empty block every couple of seconds,
 * so a single "block zero to latest" query stopped working once the chain
 * passed 200,000 blocks — about four and a half days after it started. The
 * replay still reads the chain directly, as it must (an auditor's answer may
 * not depend on the index), but in windows kept safely under the cap and run
 * in parallel. Besu's log-bloom cache keeps each window cheap.
 */
const LOG_WINDOW = BigInt(process.env.AUDIT_LOG_WINDOW ?? 100_000);

function windows(head: bigint): { fromBlock: bigint; toBlock: bigint }[] {
  const out: { fromBlock: bigint; toBlock: bigint }[] = [];
  for (let from = 0n; from <= head; from += LOG_WINDOW) {
    const to = from + LOG_WINDOW - 1n;
    out.push({ fromBlock: from, toBlock: to < head ? to : head });
  }
  return out;
}

async function collect(
  people: Persona[],
  address: Address,
  abi: readonly unknown[],
  contract: AuditContract,
  head: bigint,
): Promise<AuditEntry[]> {
  const rawLogs = (
    await Promise.all(
      windows(head).map((range) => publicClient.getLogs({ address, ...range })),
    )
  ).flat();

  const parsed = parseEventLogs({
    abi: abi as never,
    logs: rawLogs as never,
  }) as unknown as DecodedLog[];

  const entries: AuditEntry[] = [];
  for (const log of parsed) {
    if (!log.eventName) continue;
    const described = describe(people, log.eventName, log.args ?? {});
    if (!described) continue;

    entries.push({
      blockNumber: log.blockNumber ?? 0n,
      logIndex: log.logIndex ?? 0,
      timestamp: 0,
      contract,
      eventName: log.eventName,
      description: described.description,
      transactionHash: log.transactionHash ?? "",
      emphasis: described.emphasis,
    });
  }
  return entries;
}

/** Rebuild the whole history, newest last, with block timestamps attached. */
export async function loadAuditTrail(): Promise<AuditEntry[] | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  try {
    const people = await loadPeople();
    // One head for every contract, so the three replays cover the same range.
    const head = await publicClient.getBlockNumber();
    const groups = await Promise.all([
      collect(people, deployment.contracts.IdentityRegistry, identityRegistryAbi, "IdentityRegistry", head),
      collect(people, deployment.contracts.RoleRegistry, roleRegistryAbi, "RoleRegistry", head),
      collect(people, deployment.contracts.AssetToken, assetTokenAbi, "AssetToken", head),
    ]);

    const entries = groups.flat().sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
      return a.logIndex - b.logIndex;
    });

    // One getBlock per distinct block rather than per event.
    const blockNumbers = [...new Set(entries.map((e) => e.blockNumber))];
    const timestamps = new Map<bigint, number>();
    await Promise.all(
      blockNumbers.map(async (blockNumber) => {
        const block = await publicClient.getBlock({ blockNumber });
        timestamps.set(blockNumber, Number(block.timestamp));
      }),
    );

    for (const entry of entries) {
      entry.timestamp = timestamps.get(entry.blockNumber) ?? 0;
    }

    return entries;
  } catch (error) {
    // The page says only "cannot be reached"; the cause belongs in the log.
    console.error("[audit] could not replay the history from the shared record:", error);
    return null;
  }
}

/* ----------------------------------------------------------- filtering */

export interface AuditQuery {
  /** Contract name, or "all". */
  contract?: string;
  /** Event name, or "all". */
  event?: string;
  /** Free text, matched against the rendered description. */
  q?: string;
  page?: number;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  matched: number;
  page: number;
  pageCount: number;
  /** Every event name present in the unfiltered trail, for the filter menu. */
  eventNames: string[];
  contracts: string[];
}

// Re-exported so server-side callers have one place to import from; the
// definitions live in a module with no Node imports, for the client's sake.
export { AREA_LABEL, CHANGE_LABEL, areaLabel, changeLabel } from "./audit-labels";

export const AUDIT_PAGE_SIZE = 25;

/**
 * Filter and paginate the trail.
 *
 * Done in memory over the full replay, which is honest for a chain of this
 * size and would not survive a real deployment: at scale this query belongs in
 * the indexer's Postgres tables, which exist precisely so that reading history
 * does not mean replaying it. The console reads the chain directly because the
 * claim it makes — that no database is consulted — is worth more here than the
 * milliseconds.
 */
export function queryAuditTrail(all: AuditEntry[], query: AuditQuery): AuditPage {
  const eventNames = [...new Set(all.map((e) => e.eventName))].sort();
  const contracts = [...new Set(all.map((e) => e.contract))].sort();

  const needle = query.q?.trim().toLowerCase() ?? "";
  const matchedEntries = all.filter((entry) => {
    if (query.contract && query.contract !== "all" && entry.contract !== query.contract) {
      return false;
    }
    if (query.event && query.event !== "all" && entry.eventName !== query.event) {
      return false;
    }
    if (needle && !entry.description.toLowerCase().includes(needle)) return false;
    return true;
  });

  // Newest first: an auditor opening this wants what just happened, not the
  // genesis of the chain.
  const ordered = [...matchedEntries].reverse();

  const pageCount = Math.max(1, Math.ceil(ordered.length / AUDIT_PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  const start = (page - 1) * AUDIT_PAGE_SIZE;

  return {
    entries: ordered.slice(start, start + AUDIT_PAGE_SIZE),
    total: all.length,
    matched: ordered.length,
    page,
    pageCount,
    eventNames,
    contracts,
  };
}
