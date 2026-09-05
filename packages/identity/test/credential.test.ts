import { describe, expect, it } from "vitest";

import { didFromAddress } from "../src/did.js";
import { issueRoleCredential, verifyRoleCredential } from "../src/credential.js";
import { createOfflineEthrResolver } from "../src/resolver.js";
import { Role } from "../src/roles.js";

/**
 * Well-known Hardhat development keys. These are published in Hardhat's own
 * documentation and control nothing outside a local chain.
 */
const ISSUER = {
  privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
};
const SUBJECT = {
  address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
};
const IMPOSTOR = {
  privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
};

const CHAIN_ID = 31337;
const ROLE_REGISTRY = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const now = () => Math.floor(Date.now() / 1000);

function baseInput(overrides: Partial<Parameters<typeof issueRoleCredential>[0]> = {}) {
  return {
    issuerPrivateKey: ISSUER.privateKey,
    issuerAddress: ISSUER.address,
    subjectAddress: SUBJECT.address,
    role: Role.Manager,
    chainId: CHAIN_ID,
    roleRegistryAddress: ROLE_REGISTRY,
    expiresAt: now() + 3600,
    ...overrides,
  };
}

describe("role credentials", () => {
  it("issues a credential that verifies offline", async () => {
    const jwt = await issueRoleCredential(baseInput());
    const verified = await verifyRoleCredential(jwt);

    expect(verified.role).toBe(Role.Manager);
    expect(verified.roleName).toBe("Manager");
    expect(verified.subjectAddress).toBe(SUBJECT.address.toLowerCase());
    expect(verified.issuerDid).toBe(didFromAddress(ISSUER.address, CHAIN_ID));
  });

  it("verifies with no network access, using only the identifier", async () => {
    const jwt = await issueRoleCredential(baseInput({ role: Role.Auditor }));
    // The offline resolver is the default, but pass it explicitly to make the
    // point of the test unambiguous: nothing here can reach a network.
    const verified = await verifyRoleCredential(jwt, {
      resolver: createOfflineEthrResolver(),
    });
    expect(verified.role).toBe(Role.Auditor);
  });

  it("carries the on-chain status anchor pointing at RoleRegistry", async () => {
    const jwt = await issueRoleCredential(baseInput());
    const verified = await verifyRoleCredential(jwt);

    expect(verified.status.type).toBe("OnChainRoleRegistry2026");
    expect(verified.status.registry).toBe(ROLE_REGISTRY.toLowerCase());
    expect(verified.status.account).toBe(SUBJECT.address.toLowerCase());
    expect(verified.status.roleId).toBe(Role.Manager);
  });

  it("rejects a credential signed by someone other than the stated issuer", async () => {
    // Sign with the impostor's key while claiming to be the real issuer.
    const jwt = await issueRoleCredential(
      baseInput({ issuerPrivateKey: IMPOSTOR.privateKey }),
    );
    await expect(verifyRoleCredential(jwt)).rejects.toThrow();
  });

  it("rejects an expired credential", async () => {
    const issuedAt = now() - 7200;
    const jwt = await issueRoleCredential(
      baseInput({ issuedAt, expiresAt: issuedAt + 60 }),
    );
    await expect(verifyRoleCredential(jwt)).rejects.toThrow();
  });

  it("refuses to issue a credential for Role.None", async () => {
    await expect(issueRoleCredential(baseInput({ role: Role.None }))).rejects.toThrow(
      /Role.None/,
    );
  });

  it("refuses to issue a credential that expires before it is issued", async () => {
    const t = now();
    await expect(
      issueRoleCredential(baseInput({ issuedAt: t, expiresAt: t - 1 })),
    ).rejects.toThrow(/must be after issuance/);
  });

  it("keeps roles distinct — a Manager credential does not read as Admin", async () => {
    const jwt = await issueRoleCredential(baseInput({ role: Role.Manager }));
    const verified = await verifyRoleCredential(jwt);
    expect(verified.role).not.toBe(Role.Admin);
    expect(verified.status.roleId).toBe(Role.Manager);
  });
});

describe("offline did:ethr resolver", () => {
  it("resolves an identifier to a blockchainAccountId document", async () => {
    const resolver = createOfflineEthrResolver();
    const did = didFromAddress(SUBJECT.address, CHAIN_ID);
    const result = await resolver.resolve(did);

    expect(result.didDocument?.id).toBe(did);
    const method = result.didDocument?.verificationMethod?.[0];
    expect(method?.type).toBe("EcdsaSecp256k1RecoveryMethod2020");
    expect(method?.blockchainAccountId).toBe(
      `eip155:${CHAIN_ID}:${SUBJECT.address.toLowerCase()}`,
    );
  });

  it("reports an error for a DID method it does not support", async () => {
    const resolver = createOfflineEthrResolver();
    const result = await resolver.resolve("did:key:z6MkfooBar");
    expect(result.didResolutionMetadata.error).toBe("invalidDid");
    expect(result.didDocument).toBeNull();
  });
});
