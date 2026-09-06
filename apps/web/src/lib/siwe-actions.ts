"use server";

import { cookies, headers } from "next/headers";
import { isAddress, verifyMessage, type Address } from "viem";

import { consoleRoleForAddress } from "./console-role";
import { loadPeople } from "./people";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "./session";
import { buildSignInMessage, consumeNonce, createNonce } from "./siwe";
import type { SiweState } from "./siwe-types";

/** Hand the browser a fresh challenge to sign. */
export async function requestNonce(): Promise<{ nonce: string; domain: string; issuedAt: string }> {
  const host = (await headers()).get("host") ?? "localhost";
  return { nonce: createNonce(), domain: host, issuedAt: new Date().toISOString() };
}

/**
 * Verify a signed challenge and, if the chain says this address administers
 * anything, issue a session.
 *
 * Note the order: the signature proves *who* is asking, and only then does the
 * chain decide *what* they may open. A valid signature from an address with no
 * credential gets a clear refusal rather than an empty console.
 */
export async function verifySignIn(
  _prev: SiweState,
  formData: FormData,
): Promise<SiweState> {
  const address = String(formData.get("address") ?? "");
  const signature = String(formData.get("signature") ?? "");
  const nonce = String(formData.get("nonce") ?? "");
  const issuedAt = String(formData.get("issuedAt") ?? "");
  const domain = String(formData.get("domain") ?? "");

  if (!isAddress(address) || !signature || !nonce) {
    return { status: "error", message: "That sign-in attempt was incomplete." };
  }

  if (!consumeNonce(nonce)) {
    return {
      status: "error",
      message: "That challenge has expired or was already used. Try again.",
    };
  }

  const message = buildSignInMessage({ address, nonce, issuedAt, domain });

  let valid = false;
  try {
    valid = await verifyMessage({ address: address as Address, message, signature: signature as `0x${string}` });
  } catch {
    valid = false;
  }

  if (!valid) {
    return { status: "error", message: "That signature does not match the address." };
  }

  const role = await consoleRoleForAddress(address as Address);
  if (!role) {
    return {
      status: "error",
      message:
        "This key is genuine, but the chain records no Admin or Auditor credential for it — nothing to administer.",
    };
  }

  // A display name is a convenience from our own records. The authority for
  // this session is the signature and the on-chain role, never this lookup.
  const people = await loadPeople();
  const known = people.find((p) => p.address.toLowerCase() === address.toLowerCase());

  const token = await createSessionToken({
    username: address.toLowerCase(),
    displayName: known?.name ?? `${address.slice(0, 6)}…${address.slice(-4)}`,
    role,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { status: "ok", role };
}
