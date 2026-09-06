import type { Role } from "@sih26125/identity";

/**
 * The custody bundle — a complete chain of custody for one asset, exported so
 * it can be verified on a machine with no network access.
 *
 * Deliberately self-contained: the credentials are here, the ownership history
 * is here, and a snapshot of on-chain credential status is here. What is *not*
 * here is any way to confirm that snapshot is still current, and the verifier
 * says so out loud rather than implying a freshness it cannot demonstrate.
 */

export const BUNDLE_FORMAT = "sih26125-custody-bundle";
export const BUNDLE_VERSION = 1;

export interface BundleChain {
  chainId: number;
  contracts: {
    IdentityRegistry: string;
    RoleRegistry: string;
    AssetToken: string;
  };
}

export interface BundleAsset {
  tokenId: string;
  requiredRole: Role;
  requiredRoleLabel: string;
  metadataHash: string;
  mintedAt: number;
}

/** One movement of the asset. The mint appears as a transfer from the zero address. */
export interface CustodyStep {
  from: string;
  to: string;
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
}

/** What the RoleRegistry said about one account's role, at the moment of export. */
export interface StatusEntry {
  account: string;
  role: Role;
  roleLabel: string;
  valid: boolean;
  reason: "valid" | "never-granted" | "revoked" | "expired";
  expiry: number;
}

export interface StatusSnapshot {
  takenAtBlock: number;
  /** Unix seconds — the chain's own clock, not the exporter's wall clock. */
  takenAt: number;
  entries: StatusEntry[];
}

export interface CustodyBundle {
  format: typeof BUNDLE_FORMAT;
  version: number;
  exportedAt: number;
  chain: BundleChain;
  asset: BundleAsset;
  custody: CustodyStep[];
  /** Role credentials held by accounts appearing in the custody chain. */
  credentials: string[];
  status: StatusSnapshot;
  /**
   * Signature over the digest of everything above, by the exporting authority.
   * Absent on an unsigned bundle, which the verifier reports rather than rejects.
   */
  attestation?: string;
}
