import { describe, expect, it } from "vitest";

import {
  apply,
  emptyProjection,
  replay,
  toIndexedEvent,
  type IndexedEvent,
} from "../src/transform.js";

const PRIYA = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const RAHUL = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const NEW_KEY = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
const ZERO = "0x0000000000000000000000000000000000000000";

const Role = { User: 1, Manager: 3 } as const;

let seq = 0;
function event(
  eventName: string,
  args: Record<string, unknown>,
  overrides: Partial<IndexedEvent> = {},
): IndexedEvent {
  seq += 1;
  return {
    blockNumber: seq,
    logIndex: 0,
    transactionHash: `0x${seq.toString(16).padStart(64, "0")}`,
    contract: "RoleRegistry",
    eventName,
    payload: args,
    occurredAt: new Date(1_800_000_000_000 + seq * 1000),
    ...overrides,
  };
}

describe("decoding a log into a row", () => {
  it("serialises bigints, which do not survive JSON", () => {
    const indexed = toIndexedEvent(
      {
        eventName: "BusinessRoleGranted",
        args: { account: PRIYA, role: 3, expiry: 1_800_000_000n },
        blockNumber: 12n,
        logIndex: 2,
        transactionHash: "0xabc",
      },
      "RoleRegistry",
      1_700_000_000,
    );

    expect(indexed?.payload.expiry).toBe("1800000000");
    expect(indexed?.blockNumber).toBe(12);
    expect(indexed?.occurredAt.getTime()).toBe(1_700_000_000_000);
  });

  it("ignores a log it could not decode", () => {
    expect(toIndexedEvent({ transactionHash: "0xabc" }, "RoleRegistry", 0)).toBeNull();
    expect(toIndexedEvent({ eventName: "Transfer" }, "AssetToken", 0)).toBeNull();
  });
});

describe("projecting credentials", () => {
  it("records a grant with its expiry", () => {
    const p = apply(
      emptyProjection(),
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "1800000000" }),
    );
    const grant = p.roleGrants.get(`${PRIYA.toLowerCase()}:3`);
    expect(grant?.expiry).toBe(1_800_000_000);
    expect(grant?.revoked).toBe(false);
  });

  it("marks a revocation without losing the expiry", () => {
    let p = apply(
      emptyProjection(),
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "1800000000" }),
    );
    p = apply(p, event("BusinessRoleRevoked", { account: PRIYA, role: Role.Manager }));

    const grant = p.roleGrants.get(`${PRIYA.toLowerCase()}:3`);
    expect(grant?.revoked).toBe(true);
    expect(grant?.expiry).toBe(1_800_000_000);
  });

  it("clears a revocation when the role is granted again, matching the contract", () => {
    let p = apply(
      emptyProjection(),
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "100" }),
    );
    p = apply(p, event("BusinessRoleRevoked", { account: PRIYA, role: Role.Manager }));
    p = apply(
      p,
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "200" }),
    );

    const grant = p.roleGrants.get(`${PRIYA.toLowerCase()}:3`);
    expect(grant?.revoked).toBe(false);
    expect(grant?.expiry).toBe(200);
  });

  it("keeps a person's roles independent of one another", () => {
    let p = apply(
      emptyProjection(),
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "100" }),
    );
    p = apply(p, event("BusinessRoleGranted", { account: PRIYA, role: Role.User, expiry: "100" }));
    p = apply(p, event("BusinessRoleRevoked", { account: PRIYA, role: Role.Manager }));

    expect(p.roleGrants.get(`${PRIYA.toLowerCase()}:3`)?.revoked).toBe(true);
    expect(p.roleGrants.get(`${PRIYA.toLowerCase()}:1`)?.revoked).toBe(false);
  });
});

describe("projecting custody", () => {
  it("records a mint as the first holder", () => {
    const p = apply(
      emptyProjection(),
      event("AssetMinted", {
        tokenId: "1",
        to: PRIYA,
        requiredRole: Role.Manager,
        metadataHash: "0xa3",
      }),
    );
    expect(p.assets.get("1")?.owner).toBe(PRIYA.toLowerCase());
  });

  it("follows a transfer to the new holder", () => {
    let p = apply(
      emptyProjection(),
      event("AssetMinted", { tokenId: "1", to: PRIYA, requiredRole: 3, metadataHash: "0xa3" }),
    );
    p = apply(p, event("Transfer", { tokenId: "1", from: PRIYA, to: RAHUL }));

    expect(p.assets.get("1")?.owner).toBe(RAHUL.toLowerCase());
  });

  it("ignores the zero-address Transfer that accompanies a mint", () => {
    let p = apply(
      emptyProjection(),
      event("AssetMinted", { tokenId: "1", to: PRIYA, requiredRole: 3, metadataHash: "0xa3" }),
    );
    p = apply(p, event("Transfer", { tokenId: "1", from: ZERO, to: PRIYA }));

    expect(p.assets.get("1")?.owner).toBe(PRIYA.toLowerCase());
    expect(p.assets.size).toBe(1);
  });

  it("does not invent an asset from a transfer it never saw minted", () => {
    const p = apply(emptyProjection(), event("Transfer", { tokenId: "99", from: PRIYA, to: RAHUL }));
    expect(p.assets.size).toBe(0);
  });
});

describe("projecting identities", () => {
  it("records a registration", () => {
    const p = apply(
      emptyProjection(),
      event("IdentityRegistered", { account: PRIYA, did: "did:ethr:0x7a69:abc" }),
    );
    expect(p.identities.get(PRIYA.toLowerCase())?.did).toBe("did:ethr:0x7a69:abc");
  });

  it("moves the DID onto the new key after a guardian recovery, and frees the old", () => {
    let p = apply(
      emptyProjection(),
      event("IdentityRegistered", { account: PRIYA, did: "did:ethr:0x7a69:abc" }),
    );
    p = apply(
      p,
      event("IdentityKeyRotated", {
        oldAccount: PRIYA,
        newAccount: NEW_KEY,
        did: "did:ethr:0x7a69:abc",
      }),
    );

    expect(p.identities.has(PRIYA.toLowerCase())).toBe(false);
    expect(p.identities.get(NEW_KEY.toLowerCase())?.did).toBe("did:ethr:0x7a69:abc");
  });
});

describe("the index is rebuildable", () => {
  it("replaying out-of-order events lands in the same state as in-order", () => {
    const events = [
      event("AssetMinted", { tokenId: "1", to: PRIYA, requiredRole: 3, metadataHash: "0xa3" }),
      event("BusinessRoleGranted", { account: RAHUL, role: Role.Manager, expiry: "500" }),
      event("Transfer", { tokenId: "1", from: PRIYA, to: RAHUL }),
      event("BusinessRoleRevoked", { account: PRIYA, role: Role.Manager }),
    ];

    const inOrder = replay(events);
    const shuffled = replay([...events].reverse());

    expect(shuffled.assets.get("1")?.owner).toBe(inOrder.assets.get("1")?.owner);
    expect(shuffled.assets.get("1")?.owner).toBe(RAHUL.toLowerCase());
    expect([...shuffled.roleGrants.keys()].sort()).toEqual(
      [...inOrder.roleGrants.keys()].sort(),
    );
  });

  it("replaying twice is identical to replaying once", () => {
    const events = [
      event("IdentityRegistered", { account: PRIYA, did: "did:x" }),
      event("BusinessRoleGranted", { account: PRIYA, role: Role.Manager, expiry: "500" }),
      event("AssetMinted", { tokenId: "1", to: PRIYA, requiredRole: 3, metadataHash: "0xa3" }),
    ];

    const once = replay(events);
    const twice = replay([...events, ...events]);

    expect(twice.assets.size).toBe(once.assets.size);
    expect(twice.roleGrants.size).toBe(once.roleGrants.size);
    expect(twice.identities.size).toBe(once.identities.size);
  });
});
