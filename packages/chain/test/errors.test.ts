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
    expect(explained.title).toBe("Transfer blocked");
    expect(explained.detail).toBe(
      "Recipient does not hold a valid Manager credential (expired 12 Aug 2026).",
    );
    expect(explained.requiredRole).toBe(Role.Manager);
    expect(explained.expiredAt?.getTime()).toBe(EXPIRY_TS * 1000);
  });

  it("explains a revoked credential", () => {
    const data = encode("TransferBlockedRoleRevoked", [RECIPIENT, Role.Manager]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("role-revoked");
    expect(explained.detail).toBe(
      "Recipient's Manager credential has been revoked.",
    );
  });

  it("explains a credential that was never issued", () => {
    const data = encode("TransferBlockedRoleNeverGranted", [RECIPIENT, Role.Manager]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("role-never-granted");
    expect(explained.detail).toBe(
      "Recipient was never issued a Manager credential.",
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
      "This account does not hold the Issuer role required for that operation.",
    );
  });

  it("explains a reassignment from the wrong holder", () => {
    const data = encode("UnexpectedOwner", [7n, RECIPIENT, HOLDER]);
    const explained = decodeContractErrorData(data);

    expect(explained.reason).toBe("unexpected-owner");
    expect(explained.detail).toContain("Asset #7");
    expect(explained.detail).toContain(HOLDER);
  });

  it("explains a missing asset", () => {
    const data = encode("ERC721NonexistentToken", [42n]);
    expect(decodeContractErrorData(data).detail).toBe("Asset #42 does not exist.");
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
