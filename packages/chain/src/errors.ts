import { decodeErrorResult, keccak256, toHex, type Hex } from "viem";

import { Role, roleName } from "@sih26125/identity";

import { allErrorsAbi } from "./abi.js";

/**
 * Turning a revert into a sentence.
 *
 * The demo peaks on a transaction *failing*, and a raw revert is unreadable —
 * `0x8f4eb604...` in a red toast convinces nobody. Every failure path the judge
 * can trigger is decoded here into a sentence they can read off the screen,
 * which is why the contracts use custom errors rather than require-strings:
 * a custom error carries typed arguments (which role, whose account, expired
 * when), and a require-string carries only prose.
 */

export type BlockedReason =
  | "role-never-granted"
  | "role-revoked"
  | "role-expired"
  | "not-authorised"
  | "unexpected-owner"
  | "nonexistent-asset"
  | "unknown";

export interface ContractErrorExplanation {
  reason: BlockedReason;
  /** Short headline, e.g. "Transfer blocked". */
  title: string;
  /** Full sentence, safe to render verbatim in the UI. */
  detail: string;
  /** Decoded Solidity error name, when we recognised one. */
  errorName?: string;
  recipient?: string;
  requiredRole?: Role;
  expiredAt?: Date;
}

/** "12 Aug 2026" — unambiguous, and the format an Indian audience reads naturally. */
export function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Technical AccessControl roles, hashed, so an authorisation failure names the role. */
const KNOWN_ACCESS_CONTROL_ROLES = new Map<string, string>([
  [`0x${"0".repeat(64)}`, "Admin"],
  [keccak256(toHex("ISSUER_ROLE")), "Issuer"],
  [keccak256(toHex("REVOKER_ROLE")), "Revoker"],
]);

const UNKNOWN: ContractErrorExplanation = {
  reason: "unknown",
  title: "Transaction failed",
  detail: "The transaction was rejected by the contract for an unrecognised reason.",
};

/** Decode raw revert data into something a person can read. */
export function decodeContractErrorData(data: Hex): ContractErrorExplanation {
  let decoded: { errorName: string; args?: readonly unknown[] };
  try {
    const result = decodeErrorResult({ abi: allErrorsAbi, data });
    decoded = { errorName: result.errorName, args: result.args };
  } catch {
    return { ...UNKNOWN, detail: `${UNKNOWN.detail} (raw data: ${data.slice(0, 10)}…)` };
  }

  const args = decoded.args ?? [];

  switch (decoded.errorName) {
    case "TransferBlockedRoleNeverGranted": {
      const recipient = args[0] as string;
      const required = Number(args[1]) as Role;
      return {
        reason: "role-never-granted",
        title: "Transfer blocked",
        detail: `Recipient was never issued a ${roleName(required)} credential.`,
        errorName: decoded.errorName,
        recipient,
        requiredRole: required,
      };
    }

    case "TransferBlockedRoleRevoked": {
      const recipient = args[0] as string;
      const required = Number(args[1]) as Role;
      return {
        reason: "role-revoked",
        title: "Transfer blocked",
        detail: `Recipient's ${roleName(required)} credential has been revoked.`,
        errorName: decoded.errorName,
        recipient,
        requiredRole: required,
      };
    }

    case "TransferBlockedRoleExpired": {
      const recipient = args[0] as string;
      const required = Number(args[1]) as Role;
      const expiredAt = new Date(Number(args[2] as bigint) * 1000);
      return {
        reason: "role-expired",
        title: "Transfer blocked",
        detail: `Recipient does not hold a valid ${roleName(required)} credential (expired ${formatExpiry(expiredAt)}).`,
        errorName: decoded.errorName,
        recipient,
        requiredRole: required,
        expiredAt,
      };
    }

    case "AccessControlUnauthorizedAccount": {
      const account = args[0] as string;
      const roleHash = args[1] as string;
      const named = KNOWN_ACCESS_CONTROL_ROLES.get(roleHash.toLowerCase());
      return {
        reason: "not-authorised",
        title: "Not authorised",
        detail: named
          ? `This account does not hold the ${named} role required for that operation.`
          : "This account does not hold the role required for that operation.",
        errorName: decoded.errorName,
        recipient: account,
      };
    }

    case "UnexpectedOwner": {
      const tokenId = args[0] as bigint;
      const actual = args[2] as string;
      return {
        reason: "unexpected-owner",
        title: "Reassignment blocked",
        detail: `Asset #${tokenId.toString()} is not held by the account given — it is held by ${actual}.`,
        errorName: decoded.errorName,
      };
    }

    case "ERC721NonexistentToken": {
      const tokenId = args[0] as bigint;
      return {
        reason: "nonexistent-asset",
        title: "Asset not found",
        detail: `Asset #${tokenId.toString()} does not exist.`,
        errorName: decoded.errorName,
      };
    }

    default:
      return {
        ...UNKNOWN,
        errorName: decoded.errorName,
        detail: `The contract rejected this transaction (${decoded.errorName}).`,
      };
  }
}

/** Pull revert data out of a thrown viem error, whatever shape it arrived in. */
function findRevertData(error: unknown, depth = 0): Hex | undefined {
  if (!error || typeof error !== "object" || depth > 10) return undefined;

  const candidate = error as { raw?: unknown; data?: unknown; cause?: unknown };

  for (const value of [candidate.raw, candidate.data]) {
    if (typeof value === "string" && value.startsWith("0x") && value.length >= 10) {
      return value as Hex;
    }
    // viem sometimes nests the decoded shape under `data`.
    if (value && typeof value === "object") {
      const nested = (value as { data?: unknown }).data;
      if (typeof nested === "string" && nested.startsWith("0x") && nested.length >= 10) {
        return nested as Hex;
      }
    }
  }

  return findRevertData(candidate.cause, depth + 1);
}

/**
 * Explain a thrown contract error. Falls back to a generic message rather than
 * throwing — a UI must always have something to render.
 */
export function explainContractError(error: unknown): ContractErrorExplanation {
  const data = findRevertData(error);
  if (!data) return UNKNOWN;
  return decodeContractErrorData(data);
}
