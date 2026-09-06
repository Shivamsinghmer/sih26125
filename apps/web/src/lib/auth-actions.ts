"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyCredentials } from "./auth";
import type { LoginState } from "./login-types";
import { ROLE_HOME } from "./auth-types";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
} from "./session";

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    // One message for both failures, so this cannot be used to discover which
    // usernames exist.
    return { error: "That username and password do not match." };
  }

  const token = await createSessionToken({
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect(ROLE_HOME[user.role]);
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

/** The signed-in user, for server components. Null when not signed in. */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}
