/**
 * Plain names for what the record calls things.
 *
 * Kept apart from `audit.ts` on purpose. That module reaches the chain, so it
 * pulls in `node:fs` through `chain.ts`; importing these maps from a client
 * component would drag the whole server path into the browser bundle, and
 * webpack fails on the `node:` scheme rather than warning. This file imports
 * nothing at all, so both sides can use it.
 *
 * The stored values are untouched. A filtered link an auditor pastes into a
 * report carries `?contract=RoleRegistry`, and quietly renaming that would break
 * every link already written down — so only what a reader sees is translated,
 * which is the half that was ever the barrier.
 */

export const AREA_LABEL: Record<string, string> = {
  IdentityRegistry: "People and IDs",
  RoleRegistry: "Clearances",
  AssetToken: "Equipment",
};

export const CHANGE_LABEL: Record<string, string> = {
  IdentityRegistered: "Digital ID created",
  IdentityStatusChanged: "Digital ID status changed",
  BusinessRoleGranted: "Clearance given",
  BusinessRoleRevoked: "Clearance taken away",
  AssetMinted: "Equipment added",
  Transfer: "Item handed over",
};

/** Falls back to spacing out the raw name rather than showing nothing. */
export function changeLabel(eventName: string): string {
  return CHANGE_LABEL[eventName] ?? eventName.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function areaLabel(contract: string): string {
  return AREA_LABEL[contract] ?? contract;
}
