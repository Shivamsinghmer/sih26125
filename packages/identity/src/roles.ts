/**
 * The four business roles named by the problem statement.
 *
 * These numeric values MUST stay in lockstep with the `Role` enum in
 * `packages/contracts/contracts/RoleRegistry.sol`. A credential issued here
 * carries `roleId`, and the on-chain check in `AssetToken._update` reads the
 * same number, so a drift between the two would silently mis-gate transfers.
 */
export enum Role {
  None = 0,
  User = 1,
  Auditor = 2,
  Manager = 3,
  Admin = 4,
}

export const ROLE_NAMES: Readonly<Record<Role, string>> = Object.freeze({
  [Role.None]: "None",
  [Role.User]: "User",
  [Role.Auditor]: "Auditor",
  [Role.Manager]: "Manager",
  [Role.Admin]: "Admin",
});

export function roleName(role: Role): string {
  return ROLE_NAMES[role] ?? "Unknown";
}

/** Parse a role name back to its enum value, case-insensitively. */
export function roleFromName(name: string): Role {
  const found = (Object.keys(ROLE_NAMES) as Array<`${Role}`>).find(
    (key) => ROLE_NAMES[Number(key) as Role].toLowerCase() === name.toLowerCase(),
  );
  if (found === undefined) throw new Error(`Unknown role name: ${name}`);
  return Number(found) as Role;
}
