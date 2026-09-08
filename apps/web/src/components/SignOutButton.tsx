"use client";

import { logoutAction } from "@/lib/auth-actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-full border border-mist-gray px-4 py-2 text-caption leading-caption text-label transition-colors hover:border-ink-black hover:text-ink-black"
      >
        Sign out
      </button>
    </form>
  );
}
