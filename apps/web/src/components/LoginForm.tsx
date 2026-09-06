"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/auth-actions";
import { LOGIN_IDLE } from "@/lib/login-types";
import { PillButton } from "./ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, LOGIN_IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-caption leading-caption text-slate-gray">Terminal ID</span>
        <input
          name="username"
          autoComplete="username"
          autoFocus
          required
          className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-caption leading-caption text-slate-gray">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-caption leading-caption text-sienna-brown">
          {state.error}
        </p>
      ) : null}

      <div className="mt-2">
        <PillButton type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in as terminal"}
        </PillButton>
      </div>
    </form>
  );
}
