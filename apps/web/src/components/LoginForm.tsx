"use client";

import { useActionState } from "react";

import { loginAction } from "@/lib/auth-actions";
import { LOGIN_IDLE } from "@/lib/login-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, LOGIN_IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-caption leading-caption text-label">Terminal ID</span>
        <Input
          name="username"
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-caption leading-caption text-label">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-caption leading-caption text-sienna-brown">
          {state.error}
        </p>
      ) : null}

      <div className="mt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in as terminal"}
        </Button>
      </div>
    </form>
  );
}
