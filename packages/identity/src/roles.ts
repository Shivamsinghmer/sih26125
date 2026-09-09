/**
 * The clearance levels the Ministry of Defence uses.
 *
 * Restricted, Confidential, Secret and Top Secret are the levels the Security
 * Manual for Licensed Defence Industries (DDP, revised June 2025) para 5.1.3
 * applies to "documents and equipment" alike, which is why the same ladder
 * grades a person and the item they want to carry.
 *
 * They replaced None/User/Auditor/Manager/Admin, which mixed clearance with
 * authority. Authority — who may issue, revoke or inspect — is held as
 * AccessControl roles on RoleRegistry instead.
 *
 * These numeric values MUST stay in lockstep with the `Role` enum in
 * `packages/contracts/contracts/RoleRegistry.sol`. A credential issued here
 * carries `roleId`, and the on-chain check in `AssetToken._update` reads the
 * same number, so a drift between the two would silently mis-gate transfers.
 */
export enum Role {
  None = 0,
  Restricted = 1,
  Confidential = 2,
  Secret = 3,
  TopSecret = 4,
}

export const ROLE_NAMES: Readonly<Record<Role, string>> = Object.freeze({
  [Role.None]: "None",
  [Role.Restricted]: "Restricted",
  [Role.Confidential]: "Confidential",
  [Role.Secret]: "Secret",
  [Role.TopSecret]: "Top Secret",
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
