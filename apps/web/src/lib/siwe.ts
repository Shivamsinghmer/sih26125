import { randomUUID } from "node:crypto";

/**
 * The sign-in challenge.
 *
 * A SIWE-shaped message rather than an opaque blob, so a person can read what
 * they are signing before they sign it — the whole point of asking someone to
 * sign something.
 *
 * Nonces are single-use and short-lived, held in memory. That is sufficient for
 * one server process and explicitly not sufficient for several: a real
 * deployment puts these in Redis or Postgres, or the same nonce could be
 * replayed against a different instance.
 */

const NONCE_TTL_MS = 5 * 60 * 1000;

const nonces = new Map<string, number>();

function sweep() {
  const now = Date.now();
  for (const [nonce, expires] of nonces) {
    if (expires < now) nonces.delete(nonce);
  }
}

export function createNonce(): string {
  sweep();
  const nonce = randomUUID().replace(/-/g, "");
  nonces.set(nonce, Date.now() + NONCE_TTL_MS);
  return nonce;
}

/** True only the first time a live nonce is presented. */
export function consumeNonce(nonce: string): boolean {
  sweep();
  const expires = nonces.get(nonce);
  if (expires === undefined || expires < Date.now()) return false;
  nonces.delete(nonce);
  return true;
}

export interface SignInMessageParts {
  address: string;
  nonce: string;
  issuedAt: string;
  domain: string;
}

/**
 * Built identically on both sides: the client signs this, the server rebuilds
 * it from the fields it was given and verifies the signature against it, so a
 * signature over some *other* text cannot be replayed here.
 */
export function buildSignInMessage(parts: SignInMessageParts): string {
  return [
    `${parts.domain} wants you to sign in with your BEL identity.`,
    "",
    `Address: ${parts.address}`,
    "",
    "This proves you hold the key behind this identity. Your role is then read",
    "from the chain — signing in grants no permission the chain does not already",
    "record for this address.",
    "",
    `Nonce: ${parts.nonce}`,
    `Issued At: ${parts.issuedAt}`,
  ].join("\n");
}
