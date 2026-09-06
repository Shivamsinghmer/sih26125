import { createHash } from "node:crypto";

import type { CustodyBundle } from "./types.js";

/**
 * Canonical JSON: object keys sorted at every depth, no incidental whitespace.
 *
 * Two exports of the same facts must produce the same digest regardless of key
 * order, or a re-serialised bundle would fail its own signature check.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/**
 * Digest of a bundle's contents, excluding the attestation itself — the
 * signature cannot cover the field that holds it.
 */
export function bundleDigest(bundle: CustodyBundle): string {
  const { attestation: _attestation, ...rest } = bundle;
  return createHash("sha256").update(canonicalJson(rest), "utf8").digest("hex");
}
