import { ES256KSigner, createJWT, verifyJWT } from "did-jwt";
import type { Resolvable } from "did-resolver";

import { didFromAddress } from "./did.js";
import { createOfflineEthrResolver } from "./resolver.js";

/**
 * Generic signed attestations, for statements that are not role credentials —
 * currently the custody bundle's export signature.
 *
 * All private-key handling lives in this package so no other package needs to
 * touch key material.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error("Private key must be valid hex");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface SignAttestationInput {
  payload: Record<string, unknown>;
  issuerPrivateKey: string;
  issuerAddress: string;
  chainId: number;
}

/** Sign an arbitrary payload as the issuing authority. */
export async function signAttestation(input: SignAttestationInput): Promise<string> {
  return createJWT(
    input.payload,
    {
      issuer: didFromAddress(input.issuerAddress, input.chainId),
      signer: ES256KSigner(hexToBytes(input.issuerPrivateKey), true),
    },
    { alg: "ES256K-R" },
  );
}

export interface VerifiedAttestation {
  issuerDid: string;
  payload: Record<string, unknown>;
}

/**
 * Verify an attestation's signature. Uses the offline resolver by default, so
 * this works with no network access.
 */
export async function verifyAttestation(
  jwt: string,
  options: { resolver?: Resolvable } = {},
): Promise<VerifiedAttestation> {
  const resolver = options.resolver ?? createOfflineEthrResolver();
  const verified = await verifyJWT(jwt, { resolver });
  return {
    issuerDid: verified.issuer,
    payload: verified.payload as Record<string, unknown>,
  };
}
