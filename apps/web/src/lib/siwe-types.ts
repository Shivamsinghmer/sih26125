import type { ConsoleRole } from "./auth-types";

/** See `login-types.ts` — a "use server" module may only export async functions. */
export type SiweState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; role: ConsoleRole };

export const SIWE_IDLE: SiweState = { status: "idle" };
