import type { GateResult } from "./state";

/** See `login-types.ts` — a "use server" module may only export async functions. */
export type GateState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "found"; result: GateResult };

export const GATE_IDLE: GateState = { status: "idle" };
