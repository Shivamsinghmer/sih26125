import { encodeErrorResult, keccak256, toHex } from "viem";
import { describe, expect, it } from "vitest";

import { Role } from "@sih26125/identity";

import { allErrorsAbi } from "../src/abi.js";
import {
  decodeContractErrorData,
  explainContractError,
  formatExpiry,
} from "../src/errors.js";

const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const HOLDER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

/** Midday UTC, so the rendered date is stable across timezones. */
const EXPIRY_TS = Math.floor(Date.UTC(2026, 7, 12, 12, 0, 0) / 1000);

function encode(errorName: string, args: readonly unknown[]) {
  return encodeErrorResult({
    abi: allErrorsAbi,
    errorName,
    args,
  } as Parameters<typeof encodeErrorResult>[0]);
}

describe("decoding blocked transfers", () => {
  it("explains an expired credential, naming the role and the date", () => {
    const data = encode("TransferBlockedRoleExpired", [
      RECIPIENT,
      Role.Manager,
      BigInt(EXPIRY_TS),
    ]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("role-expired");
    expect(explained.title).toBe("Handover blocked");
    expect(explained.detail).toBe(
      "Their Manager clearance ran out on 12 Aug 2026.",
    );
    expect(explained.requiredRole).toBe(Role.Manager);
    expect(explained.expiredAt?.getTime()).toBe(EXPIRY_TS * 1000);
  });

  it("explains a revoked credential", () => {
    const data = encode("TransferBlockedRoleRevoked", [RECIPIENT, Role.Manager]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("role-revoked");
    expect(explained.detail).toBe(
      "Their Manager clearance was taken away.",
    );
  });

  it("explains a credential that was never issued", () => {
    const data = encode("TransferBlockedRoleNeverGranted", [RECIPIENT, Role.Manager]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("role-never-granted");
    expect(explained.detail).toBe(
      "They have never been given a Manager clearance.",
    );
  });

  it("distinguishes the three blocked reasons from one another", () => {
    const reasons = [
      decodeContractErrorData(
        encode("TransferBlockedRoleNeverGranted", [RECIPIENT, Role.User]),
      ).reason,
      decodeContractErrorData(
        encode("TransferBlockedRoleRevoked", [RECIPIENT, Role.User]),
      ).reason,
      decodeContractErrorData(
        encode("TransferBlockedRoleExpired", [RECIPIENT, Role.User, BigInt(EXPIRY_TS)]),
      ).reason,
    ];
    expect(new Set(reasons).size).toBe(3);
  });
});

describe("decoding administrative failures", () => {
  it("names the technical role in an authorisation failure", () => {
    const data = encode("AccessControlUnauthorizedAccount", [
      RECIPIENT,
      keccak256(toHex("ISSUER_ROLE")),
    ]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("not-authorised");
    expect(explained.detail).toBe(
      "This sign-in does not have the Issuer rights that action needs.",
    );
  });

  it("explains a reassignment from the wrong holder", () => {
    const data = encode("UnexpectedOwner", [7n, RECIPIENT, HOLDER]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("unexpected-owner");
    expect(explained.detail).toContain("Item #7");
    expect(explained.detail).toContain(HOLDER);
  });

  it("explains a missing asset", () => {
    const data = encode("ERC721NonexistentToken", [42n]);
    expect(decodeContractErrorData(data).detail).toBe("Item #42 is not on the system.");
  });
});

describe("resilience", () => {
  it("never throws on unrecognised revert data", () => {
    const explained = decodeContractErrorData("0xdeadbeef");
    expect(explained.reason).toBe("unknown");
    expect(explained.detail.length).toBeGreaterThan(0);
  });

  it("finds revert data nested in a viem-style cause chain", () => {
    const data = encode("TransferBlockedRoleRevoked", [RECIPIENT, Role.Manager]);
    const error = { cause: { cause: { raw: data } } };
    expect(explainContractError(error).reason).toBe("role-revoked");
  });

  it("falls back rather than throwing when there is no revert data at all", () => {
    expect(explainContractError(new Error("network down")).reason).toBe("unknown");
    expect(explainContractError(undefined).reason).toBe("unknown");
  });
});

describe("expiry formatting", () => {
  it("renders an unambiguous date", () => {
    expect(formatExpiry(new Date(Date.UTC(2026, 0, 5, 12)))).toBe("5 Jan 2026");
    expect(formatExpiry(new Date(Date.UTC(2026, 11, 31, 12)))).toBe("31 Dec 2026");
  });
});

describe("decoding identity errors", () => {
  // These reached the console as a raw viem dump — contract address, ABI args,
  // a docs link and a library version — because the decoder had no case for
  // them. PROJECT.md's rule is that a revert string never reaches a user.
  it("explains an address that already has an identity, without leaking the revert", () => {
    const explained = decodeContractErrorData(encode("AlreadyRegistered", [RECIPIENT]));

    expect(explained.reason).toBe("already-registered");
    expect(explained.errorName).toBe("AlreadyRegistered");
    expect(explained.title).toBe("Already on the system");
    expect(explained.detail).toContain(RECIPIENT);
    expect(explained.detail).toContain("Nothing was changed");
    // The tells of an undecoded viem error.
    expect(explained.detail).not.toMatch(/viem|Contract Call|reverted|0x[0-9a-f]{8,}/i);
  });

  it("explains an address with no identity yet", () => {
    const explained = decodeContractErrorData(encode("NotRegistered", [HOLDER]));

    expect(explained.reason).toBe("not-registered");
    expect(explained.detail).toContain(HOLDER);
    expect(explained.detail).toContain("nothing to change");
  });

  it("explains the input guards without naming Solidity", () => {
    for (const name of ["ZeroAddress", "EmptyDid", "SameAccount"]) {
      const explained = decodeContractErrorData(encode(name, []));
      expect(explained.reason).toBe("invalid-input");
      expect(explained.errorName).toBe(name);
      expect(explained.detail.length).toBeGreaterThan(20);
      expect(explained.detail).not.toMatch(/revert|viem/i);
    }
  });
});
