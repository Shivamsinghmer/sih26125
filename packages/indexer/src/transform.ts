/**
 * Pure event → row transformation and projection.
 *
 * Deliberately free of any database or network access, so the logic that decides
 * what the index *means* can be tested without either. The storage layer in
 * index.ts is then a thin write of whatever this produces.
 */

export type ContractName =
  | "IdentityRegistry"
  | "RoleRegistry"
  | "AssetToken"
  | "CredentialStatus"
  | "GuardianRecovery";

export interface RawLog {
  eventName?: string;
  args?: Record<string, unknown>;
  blockNumber?: bigint;
  logIndex?: number;
  transactionHash?: string;
}

export interface IndexedEvent {
  blockNumber: number;
  logIndex: number;
  transactionHash: string;
  contract: ContractName;
  eventName: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

const ZERO = "0x0000000000000000000000000000000000000000";

/** bigints do not survive JSON, so they are stored as decimal strings. */
function serialisable(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    out[key] = typeof value === "bigint" ? value.toString() : value;
  }
  return out;
}

export function toIndexedEvent(
  log: RawLog,
  contract: ContractName,
  blockTimestamp: number,
): IndexedEvent | null {
  if (!log.eventName || !log.transactionHash) return null;
  return {
    blockNumber: Number(log.blockNumber ?? 0n),
    logIndex: log.logIndex ?? 0,
    transactionHash: log.transactionHash,
    contract,
    eventName: log.eventName,
    payload: serialisable(log.args ?? {}),
    occurredAt: new Date(blockTimestamp * 1000),
  };
}

/* ------------------------------------------------------------ projections */

export interface AssetRow {
  tokenId: string;
  owner: string;
  requiredRole: number;
  metadataHash: string;
  mintedAt: Date;
  updatedAtBlock: number;
}

export interface RoleGrantRow {
  account: string;
  role: number;
  expiry: number;
  revoked: boolean;
  updatedAtBlock: number;
}

export interface IdentityRow {
  account: string;
  did: string;
  registeredAtBlock: number;
}

export interface Projection {
  assets: Map<string, AssetRow>;
  roleGrants: Map<string, RoleGrantRow>;
  identities: Map<string, IdentityRow>;
}

export function emptyProjection(): Projection {
  return { assets: new Map(), roleGrants: new Map(), identities: new Map() };
}

const grantKey = (account: string, role: number) => `${account.toLowerCase()}:${role}`;

/**
 * Fold one event into the projection.
 *
 * Replaying every event from block zero through this function must produce the
 * same state as following them live — that property is what lets the index be
 * dropped and rebuilt, and it is what the tests check.
 */
export function apply(projection: Projection, event: IndexedEvent): Projection {
  const args = event.payload;
  const block = event.blockNumber;

  switch (event.eventName) {
    case "IdentityRegistered": {
      const account = String(args.account ?? "").toLowerCase();
      projection.identities.set(account, {
        account,
        did: String(args.did ?? ""),
        registeredAtBlock: block,
      });
      break;
    }

    case "IdentityKeyRotated": {
      const oldAccount = String(args.oldAccount ?? "").toLowerCase();
      const newAccount = String(args.newAccount ?? "").toLowerCase();
      const existing = projection.identities.get(oldAccount);
      projection.identities.delete(oldAccount);
      projection.identities.set(newAccount, {
        account: newAccount,
        did: String(args.did ?? existing?.did ?? ""),
        registeredAtBlock: existing?.registeredAtBlock ?? block,
      });
      break;
    }

    case "BusinessRoleGranted": {
      const account = String(args.account ?? "").toLowerCase();
      const role = Number(args.role ?? 0);
      projection.roleGrants.set(grantKey(account, role), {
        account,
        role,
        expiry: Number(args.expiry ?? 0),
        // A fresh grant clears any previous revocation, matching the contract,
        // which overwrites the whole Grant struct.
        revoked: false,
        updatedAtBlock: block,
      });
      break;
    }

    case "BusinessRoleRevoked": {
      const account = String(args.account ?? "").toLowerCase();
      const role = Number(args.role ?? 0);
      const key = grantKey(account, role);
      const existing = projection.roleGrants.get(key);
      projection.roleGrants.set(key, {
        account,
        role,
        expiry: existing?.expiry ?? 0,
        revoked: true,
        updatedAtBlock: block,
      });
      break;
    }

    case "AssetMinted": {
      const tokenId = String(args.tokenId ?? "");
      projection.assets.set(tokenId, {
        tokenId,
        owner: String(args.to ?? "").toLowerCase(),
        requiredRole: Number(args.requiredRole ?? 0),
        metadataHash: String(args.metadataHash ?? ""),
        mintedAt: event.occurredAt,
        updatedAtBlock: block,
      });
      break;
    }

    case "Transfer": {
      const tokenId = String(args.tokenId ?? "");
      const to = String(args.to ?? "").toLowerCase();
      // The mint's zero-address Transfer is already covered by AssetMinted, and
      // a burn leaves no holder to record.
      if (String(args.from ?? "").toLowerCase() === ZERO || to === ZERO) break;
      const existing = projection.assets.get(tokenId);
      if (!existing) break;
      projection.assets.set(tokenId, { ...existing, owner: to, updatedAtBlock: block });
      break;
    }

    default:
      // Every event is stored in chain_events; only some move a projection.
      break;
  }

  return projection;
}

/** Rebuild the whole projection from an ordered event log. */
export function replay(events: IndexedEvent[]): Projection {
  const ordered = [...events].sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? a.logIndex - b.logIndex
      : a.blockNumber - b.blockNumber,
  );
  return ordered.reduce(apply, emptyProjection());
}
