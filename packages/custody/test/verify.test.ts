import { describe, expect, it } from "vitest";

import { Role, issueRoleCredential, roleName } from "@sih26125/identity";

import { bundleDigest, canonicalJson } from "../src/digest.js";
import { signBundle } from "../src/sign.js";
import { BUNDLE_FORMAT, BUNDLE_VERSION, type CustodyBundle } from "../src/types.js";
import { verifyBundle } from "../src/verify.js";

const ISSUER = {
  privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
};
const PRIYA = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const RAHUL = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const ZERO = "0x0000000000000000000000000000000000000000";

const CHAIN_ID = 31337;
const ROLE_REGISTRY = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// did-jwt validates nbf/exp against the real clock, so the fixture clock has to
// sit alongside it rather than at an arbitrary fixed point.
const NOW = Math.floor(Date.now() / 1000);
const EXPIRY = NOW + 30 * 86_400;

async function credentialFor(address: string, role: Role, expiresAt = EXPIRY) {
  return issueRoleCredential({
    issuerPrivateKey: ISSUER.privateKey,
    issuerAddress: ISSUER.address,
    subjectAddress: address,
    role,
    chainId: CHAIN_ID,
    roleRegistryAddress: ROLE_REGISTRY,
    expiresAt,
    issuedAt: NOW - 3600,
  });
}

async function makeBundle(
  overrides: Partial<CustodyBundle> = {},
  credentials?: string[],
): Promise<CustodyBundle> {
  const base: CustodyBundle = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    exportedAt: NOW,
    chain: {
      chainId: CHAIN_ID,
      contracts: {
        IdentityRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        RoleRegistry: ROLE_REGISTRY,
        AssetToken: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      },
    },
    asset: {
      tokenId: "1",
      requiredRole: Role.Manager,
      requiredRoleLabel: roleName(Role.Manager),
      metadataHash: `0x${"a3".repeat(32)}`,
      mintedAt: NOW - 7200,
    },
    custody: [
      {
        from: ZERO,
        to: PRIYA,
        blockNumber: 10,
        timestamp: NOW - 7200,
        transactionHash: `0x${"11".repeat(32)}`,
      },
    ],
    credentials: credentials ?? [await credentialFor(PRIYA, Role.Manager)],
    status: {
      takenAtBlock: 12,
      takenAt: NOW - 600,
      entries: [
        {
          account: PRIYA,
          role: Role.Manager,
          roleLabel: "Manager",
          valid: true,
          reason: "valid",
          expiry: EXPIRY,
        },
      ],
    },
    ...overrides,
  };
  return base;
}

describe("a well-formed bundle", () => {
  it("verifies completely when signed", async () => {
    const bundle = await signBundle(await makeBundle(), {
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
    });
    const report = await verifyBundle(bundle, { now: NOW });

    expect(report.verified).toBe(true);
    expect(report.finalHolder).toBe(PRIYA);
    expect(report.assetTokenId).toBe("1");
  });

  it("always states what it could not verify, even on success", async () => {
    const bundle = await signBundle(await makeBundle(), {
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
    });
    const report = await verifyBundle(bundle, { now: NOW });

    expect(report.verified).toBe(true);
    expect(report.couldNotVerify.length).toBeGreaterThan(0);
    expect(report.couldNotVerify.join(" ")).toMatch(/revoked since this snapshot/i);
  });

  it("reports the age of its status snapshot", async () => {
    const bundle = await signBundle(await makeBundle(), {
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
    });
    const report = await verifyBundle(bundle, { now: NOW + 3600 });
    expect(report.statusAgeSeconds).toBe(4200);
  });
});

describe("tampering", () => {
  it("detects a bundle altered after export", async () => {
    const bundle = await signBundle(await makeBundle(), {
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
    });

    // Rewrite history: claim the asset went somewhere it did not.
    const tampered: CustodyBundle = {
      ...bundle,
      custody: [{ ...bundle.custody[0]!, to: RAHUL }],
    };

    const report = await verifyBundle(tampered, { now: NOW });
    expect(report.verified).toBe(false);
    const signatureCheck = report.checks.find((c) => c.name === "Export signature");
    expect(signatureCheck?.ok).toBe(false);
    expect(signatureCheck?.detail).toMatch(/altered after export/i);
  });

  it("flags an unsigned bundle rather than silently accepting it", async () => {
    const report = await verifyBundle(await makeBundle(), { now: NOW });
    expect(report.verified).toBe(false);
    expect(
      report.checks.find((c) => c.name === "Export signature")?.detail,
    ).toMatch(/unsigned/i);
  });

  it("rejects an unrecognised format without inspecting further", async () => {
    const bundle = await makeBundle();
    const report = await verifyBundle(
      { ...bundle, format: "something-else" } as unknown as CustodyBundle,
      { now: NOW },
    );
    expect(report.verified).toBe(false);
    expect(report.checks).toHaveLength(1);
  });
});

describe("chain of custody", () => {
  it("detects a break where the asset leaves an account that never held it", async () => {
    const bundle = await signBundle(
      await makeBundle({
        custody: [
          {
            from: ZERO,
            to: PRIYA,
            blockNumber: 10,
            timestamp: NOW - 7200,
            transactionHash: `0x${"11".repeat(32)}`,
          },
          {
            // Should start from PRIYA — this asset teleports.
            from: RAHUL,
            to: RAHUL,
            blockNumber: 11,
            timestamp: NOW - 3600,
            transactionHash: `0x${"22".repeat(32)}`,
          },
        ],
      }),
      { issuerPrivateKey: ISSUER.privateKey, issuerAddress: ISSUER.address },
    );

    const report = await verifyBundle(bundle, { now: NOW });
    expect(report.verified).toBe(false);
    expect(report.checks.find((c) => c.name === "Chain of custody")?.detail).toMatch(
      /never received it/i,
    );
  });

  it("requires the history to begin with a mint", async () => {
    const bundle = await signBundle(
      await makeBundle({
        custody: [
          {
            from: PRIYA,
            to: RAHUL,
            blockNumber: 11,
            timestamp: NOW - 3600,
            transactionHash: `0x${"22".repeat(32)}`,
          },
        ],
      }),
      { issuerPrivateKey: ISSUER.privateKey, issuerAddress: ISSUER.address },
    );

    const report = await verifyBundle(bundle, { now: NOW });
    expect(report.checks.find((c) => c.name === "Chain of custody")?.detail).toMatch(
      /does not begin with a mint/i,
    );
  });
});

describe("the holder's credential", () => {
  it("fails when the holder has no credential in the bundle", async () => {
    const bundle = await signBundle(
      await makeBundle({}, [await credentialFor(RAHUL, Role.Manager)]),
      { issuerPrivateKey: ISSUER.privateKey, issuerAddress: ISSUER.address },
    );
    const report = await verifyBundle(bundle, { now: NOW });

    expect(report.verified).toBe(false);
    expect(report.checks.find((c) => c.name === "Holder is credentialled")?.detail).toMatch(
      /No Manager credential in this bundle/i,
    );
  });

  it("honours a revocation recorded in the status snapshot", async () => {
    const bundle = await signBundle(
      await makeBundle({
        status: {
          takenAtBlock: 12,
          takenAt: NOW - 600,
          entries: [
            {
              account: PRIYA,
              role: Role.Manager,
              roleLabel: "Manager",
              valid: false,
              reason: "revoked",
              expiry: EXPIRY,
            },
          ],
        },
      }),
      { issuerPrivateKey: ISSUER.privateKey, issuerAddress: ISSUER.address },
    );

    const report = await verifyBundle(bundle, { now: NOW });
    expect(report.verified).toBe(false);
    expect(report.checks.find((c) => c.name === "Holder is credentialled")?.detail).toMatch(
      /reported this holder's Manager credential as revoked/i,
    );
  });

  it("rejects a credential anchored to a different RoleRegistry", async () => {
    const foreign = await issueRoleCredential({
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
      subjectAddress: PRIYA,
      role: Role.Manager,
      chainId: CHAIN_ID,
      roleRegistryAddress: "0xdeadbeef00000000000000000000000000000000",
      expiresAt: EXPIRY,
      issuedAt: NOW - 3600,
    });

    const bundle = await signBundle(await makeBundle({}, [foreign]), {
      issuerPrivateKey: ISSUER.privateKey,
      issuerAddress: ISSUER.address,
    });

    const report = await verifyBundle(bundle, { now: NOW });
    expect(report.verified).toBe(false);
    expect(report.checks.find((c) => c.name === "Credential 1")?.detail).toMatch(
      /different RoleRegistry/i,
    );
  });
});

describe("canonical digest", () => {
  it("is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("changes when any fact changes", async () => {
    const bundle = await makeBundle();
    const altered = { ...bundle, asset: { ...bundle.asset, tokenId: "2" } };
    expect(bundleDigest(bundle)).not.toBe(bundleDigest(altered));
  });

  it("ignores the attestation field, which the signature cannot cover", async () => {
    const bundle = await makeBundle();
    const withSignature = { ...bundle, attestation: "eyJ.fake.jwt" };
    expect(bundleDigest(bundle)).toBe(bundleDigest(withSignature));
  });
});
