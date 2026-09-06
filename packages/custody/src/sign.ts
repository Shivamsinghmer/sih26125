import { signAttestation } from "@sih26125/identity";

import { bundleDigest } from "./digest.js";
import type { CustodyBundle } from "./types.js";

export interface SignBundleInput {
  issuerPrivateKey: string;
  issuerAddress: string;
}

/**
 * Attach the exporting authority's signature to a bundle.
 *
 * The signature covers a digest of everything except the signature field, so a
 * verifier can recompute it from the bundle's own bytes.
 */
export async function signBundle(
  bundle: CustodyBundle,
  input: SignBundleInput,
): Promise<CustodyBundle> {
  const digest = bundleDigest(bundle);
  const attestation = await signAttestation({
    payload: { digest, format: bundle.format, tokenId: bundle.asset.tokenId },
    issuerPrivateKey: input.issuerPrivateKey,
    issuerAddress: input.issuerAddress,
    chainId: bundle.chain.chainId,
  });
  return { ...bundle, attestation };
}
