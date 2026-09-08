/**
 * Role types and route permissions, kept apart from `auth.ts` so the edge
 * middleware can import them without dragging in `node:crypto` or a database
 * driver, neither of which exist on the edge runtime.
 */

export type ConsoleRole = "admin" | "guard" | "auditor";

export const ROLE_LABEL: Record<ConsoleRole, string> = {
  admin: "Issuing Authority",
  guard: "Gate Security",
  auditor: "Internal Audit",
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<ConsoleRole, string> = {
  admin: "/console",
  guard: "/gate",
  auditor: "/audit",
};

export const ROLE_ACCESS: Record<ConsoleRole, string[]> = {
  // An issuing authority can reach every surface, including the gate view,
  // because they have to be able to reproduce what a guard sees when one calls.
  //
  // /help is on every list. It reads nothing and changes nothing, and a guard
  // who cannot open the instructions is a guard who rings somebody instead.
  admin: ["/console", "/gate", "/audit", "/card", "/help"],
  guard: ["/gate", "/help"],
  auditor: ["/audit", "/help"],
};

/** True when `role` is permitted to reach `pathname`. */
export function canAccess(role: ConsoleRole, pathname: string): boolean {
  return ROLE_ACCESS[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
