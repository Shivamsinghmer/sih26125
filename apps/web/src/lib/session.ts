import { SignJWT, jwtVerify } from "jose";

import type { ConsoleRole } from "./auth-types";

/**
 * The session cookie.
 *
 * Kept free of any Node-only or database import on purpose: `middleware.ts`
 * runs on the edge runtime and needs to verify a session on every request, so
 * everything here has to work there. The role travels inside the signed token,
 * which means the middleware can authorise a request without a database round
 * trip on the hot path.
 */

export const SESSION_COOKIE = "sih_session";
const ISSUER = "sih26125-console";
const TTL_HOURS = 8;

/**
 * A dev fallback so the app runs out of the box. Shouting about it rather than
 * failing silently: a signing key that everyone knows is the same as no
 * signature at all, and this is exactly the kind of thing that quietly ships.
 */
function secret(): Uint8Array {
  const configured = process.env.AUTH_SECRET;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production — refusing to sign sessions with a known key");
    }
    return new TextEncoder().encode("sih26125-development-secret-not-for-production");
  }
  return new TextEncoder().encode(configured);
}

export interface SessionPayload {
  username: string;
  displayName: string;
  role: ConsoleRole;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${TTL_HOURS}h`)
    .sign(secret());
}

/** Returns null on anything wrong — expired, tampered, wrong issuer, absent. */
export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
    const { username, displayName, role } = payload as unknown as SessionPayload;
    if (!username || !role) return null;
    return { username, displayName, role };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = TTL_HOURS * 60 * 60;
