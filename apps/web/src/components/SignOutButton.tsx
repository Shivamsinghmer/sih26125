"use client";

import { logoutAction } from "@/lib/auth-actions";

/**
 * Sign-out, sized to sit beside the identity in the rail foot. An icon button
 * with its name carried by aria-label and title, because the name and role
 * beside it already say whose session this ends.
 */
export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className="flex size-9 items-center justify-center rounded-full text-label transition-colors duration-150 hover:bg-mist-gray hover:text-ink-black"
      >
        <svg
          aria-hidden
          viewBox="0 0 18 18"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 3.5H4.75A1.25 1.25 0 0 0 3.5 4.75v8.5a1.25 1.25 0 0 0 1.25 1.25H7" />
          <path d="M11.5 12.5 15 9l-3.5-3.5" />
          <path d="M15 9H7.5" />
        </svg>
      </button>
    </form>
  );
}
