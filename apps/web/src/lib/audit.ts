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
        description: `Decentralised identity registered for ${who(people, args.account as string)} — ${String(args.did)}`,
      };

    case "IdentityStatusChanged":
      return {
        description: `Identity status changed for ${who(people, args.account as string)}`,
      };

    case "BusinessRoleGranted":
      return {
        description: `${roleLabel(args.role)} credential issued to ${who(people, args.account as string)} by ${who(people, args.issuer as string)}, valid until ${when(args.expiry as bigint)}`,
      };

    case "BusinessRoleRevoked":
      return {
        description: `${roleLabel(args.role)} credential revoked for ${who(people, args.account as string)} by ${who(people, args.revoker as string)}`,
        emphasis: true,
      };

    case "AssetMinted":
      return {
        description: `Asset #${String(args.tokenId)} minted to ${who(people, args.to as string)}, requires a ${roleLabel(args.requiredRole)} credential to hold`,
      };

    case "Transfer": {
      const from = args.from as string;
      const to = args.to as string;
      // The mint already has its own richer AssetMinted entry; skip the
      // zero-address Transfer that accompanies it rather than showing both.
      if (from?.toLowerCase() === ZERO) return null;
      return {
        description: `Asset #${String(args.tokenId)} moved from ${who(people, from)} to ${who(people, to)}`,
        emphasis: true,
      };
    }

    // RoleGranted/RoleRevoked from OpenZeppelin AccessControl are the technical
    // roles used to deploy, not business credentials. They are noise here.
    default:
      return null;
  }
}

async function collect(
  people: Persona[],
  address: Address,
  abi: readonly unknown[],
  contract: AuditContract,
): Promise<AuditEntry[]> {
  const rawLogs = await publicClient.getLogs({
    address,
    fromBlock: 0n,
    toBlock: "latest",
  });

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
    const groups = await Promise.all([
      collect(people, deployment.contracts.IdentityRegistry, identityRegistryAbi, "IdentityRegistry"),
      collect(people, deployment.contracts.RoleRegistry, roleRegistryAbi, "RoleRegistry"),
      collect(people, deployment.contracts.AssetToken, assetTokenAbi, "AssetToken"),
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
  } catch {
    return null;
  }
}
