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
 *
 * The sentences are written for the person the refusal happens to, not for the
 * person who wrote the contract. "They have never been given a Manager
 * clearance" is the same fact as `TransferBlockedRoleNeverGranted`, and it is
 * the one a stores officer can act on. The decoded error name still travels
 * alongside, for whoever is diagnosing rather than working.
 */

export type BlockedReason =
  | "role-never-granted"
  | "role-revoked"
  | "role-expired"
  | "not-authorised"
  | "unexpected-owner"
  | "nonexistent-asset"
  | "already-registered"
  | "not-registered"
  | "invalid-input"
  | "unknown";

export interface ContractErrorExplanation {
  reason: BlockedReason;
  /** Short headline, e.g. "Handover blocked". */
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
  title: "Change refused",
  detail: "The shared record refused this, for a reason the system did not recognise.",
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
        title: "Handover blocked",
        detail: `They have never been given a ${roleName(required)} clearance.`,
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
        title: "Handover blocked",
        detail: `Their ${roleName(required)} clearance was taken away.`,
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
        title: "Handover blocked",
        detail: `Their ${roleName(required)} clearance ran out on ${formatExpiry(expiredAt)}.`,
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
          ? `This sign-in does not have the ${named} rights that action needs.`
          : "This sign-in does not have the rights that action needs.",
        errorName: decoded.errorName,
        recipient: account,
      };
    }

    case "UnexpectedOwner": {
      const tokenId = args[0] as bigint;
      const actual = args[2] as string;
      return {
        reason: "unexpected-owner",
        title: "Handover blocked",
        detail: `Item #${tokenId.toString()} is not held by the person given — it is held by ${actual}.`,
        errorName: decoded.errorName,
      };
    }

    // ---------------------------------------------------------- identity
    // These reached the screen as a raw viem dump — the contract call, the
    // ABI args, a docs link and a library version — because the decoder had
    // no case for them. PROJECT.md's rule is that a revert string never
    // reaches a user, and an undecoded error is exactly that with extra steps.
    case "AlreadyRegistered": {
      const account = args[0] as string;
      return {
        reason: "already-registered",
        title: "Already on the system",
        detail:
          `That account already has an identity on the shared record (${account}). ` +
          "Nothing was changed. This usually means the staff records and the " +
          "shared record have drifted apart — the person can be found under People.",
        errorName: decoded.errorName,
        recipient: account,
      };
    }

    case "NotRegistered": {
      const account = args[0] as string;
      return {
        reason: "not-registered",
        title: "Not on the system",
        detail: `That account has no identity on the shared record yet (${account}), so there is nothing to change.`,
        errorName: decoded.errorName,
        recipient: account,
      };
    }

    case "EmptyDid": {
      return {
        reason: "invalid-input",
        title: "Nothing to record",
        detail: "The identifier was empty, so there was nothing to write to the shared record.",
        errorName: decoded.errorName,
      };
    }

    case "ZeroAddress": {
      return {
        reason: "invalid-input",
        title: "No account given",
        detail: "An account has to be named before anything can be recorded against it.",
        errorName: decoded.errorName,
      };
    }

    case "SameAccount": {
      return {
        reason: "invalid-input",
        title: "Same account both sides",
        detail: "The old and new accounts are the same, so there is nothing to move.",
        errorName: decoded.errorName,
      };
    }

    case "ERC721NonexistentToken": {
      const tokenId = args[0] as bigint;
      return {
        reason: "nonexistent-asset",
        title: "Item not found",
        detail: `Item #${tokenId.toString()} is not on the system.`,
        errorName: decoded.errorName,
      };
    }

    default:
      return {
        ...UNKNOWN,
        errorName: decoded.errorName,
        detail: `The shared record refused this (${decoded.errorName}).`,
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
