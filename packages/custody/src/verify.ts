import {
  Role,
  roleName,
  verifyAttestation,
  verifyRoleCredential,
  type VerifiedRoleCredential,
} from "@sih26125/identity";

import { bundleDigest } from "./digest.js";
import { BUNDLE_FORMAT, type CustodyBundle } from "./types.js";

const ZERO = "0x0000000000000000000000000000000000000000";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface VerificationReport {
  /** True only when every check passed. */
  verified: boolean;
  checks: Check[];
  /**
   * Things this verifier structurally cannot confirm without a network. Stated
   * explicitly so a stale result is never mistaken for a fresh one.
   */
  couldNotVerify: string[];
  /** Age of the bundled status snapshot, in seconds, at the time of checking. */
  statusAgeSeconds: number;
  assetTokenId?: string;
  finalHolder?: string;
}

export interface VerifyOptions {
  /** Unix seconds; injectable so tests are not clock-dependent. */
  now?: number;
}

function lower(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

/**
 * Verify a custody bundle with no network access whatsoever.
 *
 * Everything checked here is checkable from the bundle's own bytes: signatures
 * verify against DIDs that resolve from their identifiers alone, and the
 * custody chain is checked for internal contiguity. Anything requiring a live
 * chain is reported under `couldNotVerify` rather than assumed.
 */
export async function verifyBundle(
  bundle: CustodyBundle,
  options: VerifyOptions = {},
): Promise<VerificationReport> {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const checks: Check[] = [];
  const couldNotVerify: string[] = [];

  // ------------------------------------------------------------------ format
  const formatOk = bundle.format === BUNDLE_FORMAT;
  checks.push({
    name: "Bundle format",
    ok: formatOk,
    detail: formatOk
      ? `${bundle.format} v${bundle.version}`
      : `Unrecognised format: ${String(bundle.format)}`,
  });
  if (!formatOk) {
    return {
      verified: false,
      checks,
      couldNotVerify,
      statusAgeSeconds: 0,
    };
  }

  // ------------------------------------------------------------- attestation
  if (bundle.attestation) {
    try {
      const attested = await verifyAttestation(bundle.attestation);
      const expected = bundleDigest(bundle);
      const claimed = String(attested.payload.digest ?? "");
      const digestOk = claimed === expected;
      checks.push({
        name: "Export signature",
        ok: digestOk,
        detail: digestOk
          ? `Signed by ${attested.issuerDid}; contents match the signed digest`
          : "Contents do not match the signed digest — the bundle was altered after export",
      });
    } catch (error) {
      checks.push({
        name: "Export signature",
        ok: false,
        detail: `Signature did not verify: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      });
    }
  } else {
    checks.push({
      name: "Export signature",
      ok: false,
      detail: "Bundle is unsigned — its contents are not attested by any authority",
    });
  }

  // ------------------------------------------------------------- credentials
  const verifiedCredentials: VerifiedRoleCredential[] = [];
  for (const [index, jwt] of bundle.credentials.entries()) {
    try {
      const verified = await verifyRoleCredential(jwt);
      verifiedCredentials.push(verified);
      const anchorsHere =
        lower(verified.status.registry) === lower(bundle.chain.contracts.RoleRegistry);
      checks.push({
        name: `Credential ${index + 1}`,
        ok: anchorsHere,
        detail: anchorsHere
          ? `${verified.roleName} for ${verified.subjectAddress}, issued by ${verified.issuerDid}`
          : `${verified.roleName} credential anchors a different RoleRegistry (${verified.status.registry})`,
      });
    } catch (error) {
      checks.push({
        name: `Credential ${index + 1}`,
        ok: false,
        detail: `Did not verify: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  }

  // ----------------------------------------------------------- custody chain
  const steps = bundle.custody;
  if (steps.length === 0) {
    checks.push({
      name: "Chain of custody",
      ok: false,
      detail: "Bundle contains no custody history",
    });
  } else {
    const firstIsMint = lower(steps[0]?.from) === ZERO;
    let contiguous = true;
    let brokenAt = -1;
    for (let i = 1; i < steps.length; i++) {
      if (lower(steps[i]?.from) !== lower(steps[i - 1]?.to)) {
        contiguous = false;
        brokenAt = i;
        break;
      }
    }
    const ordered = steps.every(
      (step, i) => i === 0 || step.blockNumber >= (steps[i - 1]?.blockNumber ?? 0),
    );

    checks.push({
      name: "Chain of custody",
      ok: firstIsMint && contiguous && ordered,
      detail: !firstIsMint
        ? "History does not begin with a mint, so it is not a complete record"
        : !contiguous
          ? `Broken at step ${brokenAt + 1}: the asset leaves an account that never received it`
          : !ordered
            ? "Steps are not in block order"
            : `${steps.length} step${steps.length === 1 ? "" : "s"}, unbroken from mint to current holder`,
    });
  }

  const finalHolder = steps[steps.length - 1]?.to;

  // ------------------------------------------------- holder is credentialled
  if (finalHolder) {
    const required = bundle.asset.requiredRole;
    const holderCredential = verifiedCredentials.find(
      (c) => lower(c.subjectAddress) === lower(finalHolder) && c.role === required,
    );
    const snapshotEntry = bundle.status.entries.find(
      (e) => lower(e.account) === lower(finalHolder) && e.role === required,
    );

    if (!holderCredential) {
      checks.push({
        name: "Holder is credentialled",
        ok: false,
        detail: `No ${roleName(required)} credential in this bundle for the current holder`,
      });
    } else if (holderCredential.expiresAt <= now) {
      checks.push({
        name: "Holder is credentialled",
        ok: false,
        detail: `The holder's ${holderCredential.roleName} credential expired on ${new Date(
          holderCredential.expiresAt * 1000,
        ).toISOString().slice(0, 10)}`,
      });
    } else if (snapshotEntry && !snapshotEntry.valid) {
      checks.push({
        name: "Holder is credentialled",
        ok: false,
        detail: `At export, the registry reported this holder's ${snapshotEntry.roleLabel} credential as ${snapshotEntry.reason}`,
      });
    } else {
      checks.push({
        name: "Holder is credentialled",
        ok: true,
        detail: `Current holder ${finalHolder} presents a valid ${holderCredential.roleName} credential`,
      });
    }
  }

  // -------------------------------------------------------- honest reporting
  const statusAgeSeconds = Math.max(0, now - bundle.status.takenAt);

  couldNotVerify.push(
    `Whether any credential has been revoked since this snapshot was taken ${describeAge(
      statusAgeSeconds,
    )} ago at block ${bundle.status.takenAtBlock}`,
  );
  couldNotVerify.push(
    "Whether the recorded transactions are on the canonical chain — that requires a node",
  );
  couldNotVerify.push(
    "Whether the asset has moved again since this bundle was exported",
  );

  return {
    verified: checks.every((c) => c.ok),
    checks,
    couldNotVerify,
    statusAgeSeconds,
    assetTokenId: bundle.asset.tokenId,
    finalHolder,
  };
}

export function describeAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

export { Role };
