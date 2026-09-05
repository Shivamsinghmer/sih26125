import type { DIDDocument, DIDResolutionResult, Resolvable } from "did-resolver";

import { addressFromDid, chainIdFromDid, isSupportedDid } from "./did.js";

/**
 * A did:ethr resolver that needs no network and no registry contract.
 *
 * The did:ethr method defines a *default* DID document for any address: a single
 * `EcdsaSecp256k1RecoveryMethod2020` verification method whose `blockchainAccountId`
 * is the address itself. Registry (ERC-1056) lookups only ever *add to or override*
 * that default — an identity that has never rotated a key on chain resolves
 * correctly from the identifier alone.
 *
 * Every identity we issue is in exactly that state, so resolution is pure string
 * manipulation. This is deliberate, not a shortcut: it is what allows
 * `apps/verifier` to validate a credential chain on a machine with the network
 * cable pulled. If key rotation via GuardianRecovery is added later, this resolver
 * gains a chain-backed sibling for the online path — the offline one stays as is,
 * and reports the age of its data rather than silently trusting a stale view.
 */
export function createOfflineEthrResolver(): Resolvable {
  return {
    async resolve(didUrl: string): Promise<DIDResolutionResult> {
      // Strip any fragment or query — we resolve the base identifier.
      const did = didUrl.split("#")[0]?.split("?")[0] ?? didUrl;

      if (!isSupportedDid(did)) {
        return {
          didResolutionMetadata: {
            error: "invalidDid",
            message: `Not a did:ethr identifier this resolver supports: ${did}`,
          },
          didDocument: null,
          didDocumentMetadata: {},
        };
      }

      const address = addressFromDid(did);
      const chainId = chainIdFromDid(did);
      const controllerId = `${did}#controller`;

      const didDocument: DIDDocument = {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/secp256k1recovery-2020/v2",
        ],
        id: did,
        verificationMethod: [
          {
            id: controllerId,
            type: "EcdsaSecp256k1RecoveryMethod2020",
            controller: did,
            blockchainAccountId: `eip155:${chainId}:${address}`,
          },
        ],
        authentication: [controllerId],
        assertionMethod: [controllerId],
      };

      return {
        didResolutionMetadata: { contentType: "application/did+ld+json" },
        didDocument,
        didDocumentMetadata: {},
      };
    },
  };
}
