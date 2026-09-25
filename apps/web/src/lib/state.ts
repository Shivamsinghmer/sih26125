import type { Address } from "viem";

import { assetTokenAbi, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, didFromAddress, roleName } from "@sih26125/identity";

import {
  loadPeople,
  publicClient,
  readDeployment,
  type Deployment,
  type Persona,
} from "./chain";
import { connection } from "./people";

export type RoleValidity = "valid" | "never-granted" | "revoked" | "expired";

const REASON_BY_INDEX: RoleValidity[] = ["valid", "never-granted", "revoked", "expired"];

export interface RoleHolding {
  role: Role;
  label: string;
  validity: RoleValidity;
  expiry: number;
}

export interface PersonaState {
  persona: Persona;
  registered: boolean;
  did: string | null;
  holdings: RoleHolding[];
  /** The strongest currently-valid role, for the summary line. */
  effectiveRole: Role;
}

export interface AssetState {
  tokenId: bigint;
  owner: Address;
  requiredRole: Role;
  requiredRoleLabel: string;
  mintedAt: number;
  metadataHash: string;
}

export interface ConsoleState {
  deployment: Deployment;
  personas: PersonaState[];
  assets: AssetState[];
}

const ALL_ROLES = [Role.TopSecret, Role.Secret, Role.Confidential, Role.Restricted] as const;

export async function loadPersona(
  persona: Persona,
  deployment: Deployment,
): Promise<PersonaState> {
  const identity = (await publicClient.readContract({
    address: deployment.contracts.IdentityRegistry,
    abi: identityRegistryAbi,
    functionName: "get",
    args: [persona.address],
  })) as { did: string; status: number; registeredAt: bigint };

  const holdings = await Promise.all(
    ALL_ROLES.map(async (role): Promise<RoleHolding> => {
      const [, reasonIndex, expiry] = (await publicClient.readContract({
        address: deployment.contracts.RoleRegistry,
        abi: roleRegistryAbi,
        functionName: "checkRole",
        args: [persona.address, role],
      })) as [boolean, number, bigint];

      return {
        role,
        label: roleName(role),
        validity: REASON_BY_INDEX[Number(reasonIndex)] ?? "never-granted",
        expiry: Number(expiry),
      };
    }),
  );

  const effective =
    holdings.find((h) => h.validity === "valid")?.role ?? Role.None;

  return {
    persona,
    registered: Number(identity.status) !== 0,
    did: identity.did || null,
    holdings,
    effectiveRole: effective,
  };
}

/**
 * Read from the indexer's cache, not the chain.
 *
 * This used to be a live `getContractEvents` scan from block zero on every
 * dashboard load — correct the day it was written, and then a live-fire hazard
 * once this chain sat running for weeks: QBFT here commits an empty block every
 * couple of seconds whether or not anyone uses the system, so "block zero to
 * latest" is a range that grows by tens of thousands of blocks a day even at
 * total rest. It first surfaced as Besu's own RPC range cap rejecting the
 * query outright; raising that cap only bought days, because the query itself
 * gets heavier — more blocks to read off disk — every day this stays live.
 *
 * The indexer already projects `AssetMinted`/`Transfer` into exactly this
 * shape in Postgres, and does it by walking forward from its last processed
 * block rather than by rescanning history. Reading its projection costs one
 * indexed query regardless of how long the chain has been running.
 */
async function loadAssets(): Promise<AssetState[]> {
  const sql = connection();
  const rows = await sql<
    {
      token_id: string;
      owner: string;
      required_role: number;
      metadata_hash: string;
      /** Unix seconds, as text — Postgres bigints arrive as strings. */
      minted_unix: string;
    }[]
  >`
    select token_id, owner, required_role, metadata_hash,
           extract(epoch from minted_at)::bigint as minted_unix
    from assets
    order by token_id::bigint
  `;

  return rows.map((row) => {
    const requiredRole = row.required_role as Role;
    return {
      tokenId: BigInt(row.token_id),
      owner: row.owner as Address,
      requiredRole,
      requiredRoleLabel: roleName(requiredRole),
      // Converted by Postgres, not here. This connection is shared with
      // Drizzle, and Drizzle's postgres-js driver swaps the client's timestamp
      // parser for one that returns raw strings — so `minted_at` arrived as
      // text and `.getTime()` threw the moment the first asset existed, which
      // took the whole dashboard down with it. Epoch seconds are a plain
      // number whichever parser is installed.
      mintedAt: Number(row.minted_unix),
      metadataHash: row.metadata_hash,
    };
  });
}

/** Read everything the console renders. Returns null when nothing is deployed yet. */
export async function loadConsoleState(): Promise<ConsoleState | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  try {
    const people = await loadPeople();
    const [personas, assets] = await Promise.all([
      Promise.all(people.map((p) => loadPersona(p, deployment))),
      loadAssets(),
    ]);
    return { deployment, personas, assets };
  } catch (error) {
    // Addresses on file but no chain answering, or a stale deployment file —
    // or the indexer's tables missing, or Postgres down. The page shows one
    // calm sentence for all of them, so the actual cause has to go to the
    // server log; swallowing it silently made every one of these look alike.
    console.error("[console] could not load state from the shared record:", error);
    return null;
  }
}

/* ------------------------------------------------------------- gate check */

export interface GateHolding {
  label: string;
  validity: RoleValidity;
  expiry: number;
}

export interface GateAsset {
  tokenId: string;
  requiredRoleLabel: string;
  /** Whether this holder currently satisfies what the asset demands. */
  permitted: boolean;
}

export interface GateResult {
  address: Address;
  did: string;
  /** Known to the console's own records — a convenience, never the authority. */
  name: string | null;
  photo: string | null;
  registered: boolean;
  statusLabel: string;
  holdings: GateHolding[];
  assets: GateAsset[];
  checkedAtBlock: string;
}

const IDENTITY_STATUS = ["Unregistered", "Active", "Suspended", "Retired"];

/**
 * What a guard's scanner asks the chain.
 *
 * Everything here is a read of public on-chain state — a DID is a badge number,
 * not a secret. The name and photo come from the console's own records purely
 * so a human can sanity-check the person in front of them; the chain neither
 * stores nor needs them.
 */
export async function lookupIdentity(address: Address): Promise<GateResult | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  const people = await loadPeople();
  const known = people.find((p) => p.address.toLowerCase() === address.toLowerCase());

  const [identity, blockNumber, assets] = await Promise.all([
    publicClient.readContract({
      address: deployment.contracts.IdentityRegistry,
      abi: identityRegistryAbi,
      functionName: "get",
      args: [address],
    }) as Promise<{ did: string; status: number; registeredAt: bigint }>,
    publicClient.getBlockNumber(),
    loadAssets(),
  ]);

  const holdings = await Promise.all(
    ALL_ROLES.map(async (role) => {
      const [, reasonIndex, expiry] = (await publicClient.readContract({
        address: deployment.contracts.RoleRegistry,
        abi: roleRegistryAbi,
        functionName: "checkRole",
        args: [address, role],
      })) as [boolean, number, bigint];

      return {
        label: roleName(role),
        validity: REASON_BY_INDEX[Number(reasonIndex)] ?? "never-granted",
        expiry: Number(expiry),
        role,
      };
    }),
  );

  const held = assets
    .filter((a) => a.owner.toLowerCase() === address.toLowerCase())
    .map((a) => ({
      tokenId: a.tokenId.toString(),
      requiredRoleLabel: a.requiredRoleLabel,
      permitted: holdings.some((h) => h.role === a.requiredRole && h.validity === "valid"),
    }));

  return {
    address,
    did: identity.did || didFromAddress(address, deployment.chainId),
    name: known?.name ?? null,
    photo: known?.photo ?? null,
    registered: Number(identity.status) !== 0,
    statusLabel: IDENTITY_STATUS[Number(identity.status)] ?? "Unknown",
    holdings: holdings.map(({ label, validity, expiry }) => ({ label, validity, expiry })),
    assets: held,
    checkedAtBlock: blockNumber.toString(),
  };
}
