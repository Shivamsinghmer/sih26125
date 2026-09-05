/**
 * did:ethr helpers.
 *
 * A did:ethr identifier is derived directly from an Ethereum address and the
 * chain it lives on — no registration transaction is required for the identity
 * to exist. That property is what lets the offline verifier resolve a DID with
 * no network access at all; see `resolver.ts`.
 */

const DID_ETHR_PATTERN = /^did:ethr:(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]{40})$/;

/** Normalise an address to lowercase hex, rejecting anything malformed. */
function normaliseAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Not a valid Ethereum address: ${address}`);
  }
  return address.toLowerCase();
}

/**
 * Build the did:ethr identifier for an address on a given chain.
 * Example: `did:ethr:0x7a69:0xf39f...` for chain 31337 (Hardhat).
 */
export function didFromAddress(address: string, chainId: number): string {
  const chainHex = `0x${chainId.toString(16)}`;
  return `did:ethr:${chainHex}:${normaliseAddress(address)}`;
}

/** Extract the Ethereum address from a did:ethr identifier. */
export function addressFromDid(did: string): string {
  const match = DID_ETHR_PATTERN.exec(did);
  if (!match?.[2]) throw new Error(`Not a supported did:ethr identifier: ${did}`);
  return match[2].toLowerCase();
}

/** Extract the numeric chain id from a did:ethr identifier. */
export function chainIdFromDid(did: string): number {
  const match = DID_ETHR_PATTERN.exec(did);
  if (!match?.[1]) throw new Error(`Not a supported did:ethr identifier: ${did}`);
  return Number.parseInt(match[1], 16);
}

/** True when `did` is a did:ethr identifier this package can handle. */
export function isSupportedDid(did: string): boolean {
  return DID_ETHR_PATTERN.test(did);
}
