import { keccak256, toHex } from "viem";

import { connection } from "./people";

/**
 * What a piece of equipment actually is.
 *
 * The chain holds a token id, the clearance the item requires, and a hash. It
 * does not hold "Oscilloscope OS-2140" — descriptive data lives here, the same
 * way a person's name and photograph do. That split is not squeamishness about
 * space: an asset register is operational data an organisation must be able to
 * correct, and a chain is the wrong place for anything you may need to edit.
 *
 * The hash is what stops the two drifting. `metadataHash` on the token is the
 * digest of this record, so a description edited after the fact no longer
 * matches the token and the mismatch is detectable by anyone — including the
 * offline verifier, which has the hash inside the bundle.
 *
 * Until now that hash was the placeholder `0xa3a3…`, recorded as a shortcut in
 * docs/PRODUCTION.md. It is real now.
 */

export interface Equipment {
  tokenId: number;
  name: string;
  serial: string;
  /** keccak256 of the canonical description — matches the token's metadataHash. */
  metadataHash: string;
}

/**
 * The digest the token carries.
 *
 * Canonical on purpose: field order fixed, whitespace fixed, values trimmed. A
 * digest that changes when a JSON serialiser reorders keys is a digest that
 * cannot be recomputed later, which defeats the point of having one.
 */
export function metadataHashFor(input: { name: string; serial: string }): `0x${string}` {
  const canonical = JSON.stringify({
    name: input.name.trim(),
    serial: input.serial.trim(),
  });
  return keccak256(toHex(canonical));
}

let ready = false;

async function ensureReady() {
  if (ready) return;
  const sql = connection();
  await sql`
    create table if not exists equipment (
      token_id integer primary key,
      name text not null,
      serial text not null,
      metadata_hash text not null
    )
  `;
  ready = true;
}

export async function loadEquipment(): Promise<Equipment[]> {
  await ensureReady();
  const sql = connection();
  const rows = await sql<
    { token_id: number; name: string; serial: string; metadata_hash: string }[]
  >`select token_id, name, serial, metadata_hash from equipment order by token_id`;

  return rows.map((row) => ({
    tokenId: Number(row.token_id),
    name: row.name,
    serial: row.serial,
    metadataHash: row.metadata_hash,
  }));
}

/**
 * Record what a freshly minted token refers to.
 *
 * Called after the mint, because the token id does not exist until then. If
 * this insert fails the token still exists and simply has no description — the
 * asset lists fall back to "Item #N". That is a deliberate choice over trying
 * to roll back: a mint cannot be undone, so the failure has to degrade rather
 * than pretend.
 */
export async function recordEquipment(input: Equipment): Promise<void> {
  await ensureReady();
  const sql = connection();
  await sql`
    insert into equipment (token_id, name, serial, metadata_hash)
    values (${input.tokenId}, ${input.name}, ${input.serial}, ${input.metadataHash})
    on conflict (token_id) do update
      set name = excluded.name,
          serial = excluded.serial,
          metadata_hash = excluded.metadata_hash
  `;
}

/** Index by token id, for joining against on-chain assets. */
export function equipmentByToken(list: Equipment[]): Map<number, Equipment> {
  return new Map(list.map((e) => [e.tokenId, e]));
}

/**
 * The description for an asset — but only if the token agrees it is the one.
 *
 * Token ids restart at 1 every time the contracts are redeployed, and this
 * table is keyed by token id, so a redeploy leaves rows that describe tokens
 * that no longer exist while new tokens claim the same numbers. Joining on the
 * id alone would confidently print the wrong equipment name, which is worse
 * than printing none.
 *
 * The hash settles it. The token carries the digest of its description, so a
 * row only describes this token if the two match. That also means a description
 * edited behind the system's back stops being shown rather than being shown as
 * though it were still true.
 */
export function describeAsset(
  byToken: Map<number, Equipment>,
  asset: { tokenId: bigint | number; metadataHash: string },
): Equipment | null {
  const row = byToken.get(Number(asset.tokenId));
  if (!row) return null;
  return row.metadataHash.toLowerCase() === asset.metadataHash.toLowerCase() ? row : null;
}
