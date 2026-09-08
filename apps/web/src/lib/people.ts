import { drizzle } from "drizzle-orm/postgres-js";
import { asc } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import postgres from "postgres";
import type { Address, Hex } from "viem";
import { mnemonicToAccount } from "viem/accounts";

/**
 * The people in the system, and where their keys come from.
 *
 * Two things are deliberately separated here, and the separation is the DPDP
 * answer the pitch depends on:
 *
 *   - Name, title and department are PERSONAL DATA. They live in Postgres and
 *     never touch the chain. An erasure request deletes the row; the on-chain
 *     DID and its salted hash become an irreversible orphan.
 *   - The account is derived, not stored. Each person holds an index into an
 *     HD wallet, so no private key is ever written to the database.
 *
 * For the demo the seed is Hardhat's published development mnemonic, so every
 * derived account is pre-funded on both the local chain and in the Besu genesis.
 * A real deployment holds the seed in an HSM and derives the same way, which is
 * why this is an index rather than a key: the shape does not change, only where
 * the seed lives.
 */

const DEMO_MNEMONIC =
  process.env.DEMO_MNEMONIC ??
  "test test test test test test test test test test test junk";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/sih26125";

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  addressIndex: integer("address_index").notNull(),
  /**
   * A data URL (`data:image/jpeg;base64,...`), stored as text rather than a
   * proper blob column. That is a hackathon-scale decision, not a design one —
   * fine for a few dozen ID photos, wrong for a real deployment, which would
   * put these in object storage and keep only a reference here. Whatever the
   * storage, the boundary that matters is unchanged: this column exists so the
   * photo can be printed on a card, and it is never read by anything that
   * touches the chain.
   */
  photo: text("photo"),
});

export interface Persona {
  id: string;
  name: string;
  title: string;
  addressIndex: number;
  address: Address;
  photo: string | null;
}

let client: ReturnType<typeof postgres> | null = null;
let ready = false;

/**
 * The one connection pool.
 *
 * Exported so equipment.ts shares it rather than opening a second pool against
 * the same database — two pools of four against a demo Postgres is how you end
 * up debugging connection exhaustion instead of demonstrating a product.
 */
export function connection() {
  client ??= postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
  return client;
}

/**
 * The people the demo opens with. Inserted by id with ON CONFLICT DO NOTHING,
 * so anyone added through the console is never overwritten and a default added
 * later still reaches databases that already exist.
 */
export const DEFAULT_PEOPLE = [
  { id: "admin", name: "S. Raghavan", title: "Issuing Authority, IT Security", addressIndex: 0 },
  { id: "manager", name: "Priya Menon", title: "Divisional Manager, Radar Systems", addressIndex: 1 },
  { id: "user", name: "Rahul Nair", title: "Technician, Radar Systems", addressIndex: 2 },
  { id: "auditor", name: "K. Iyer", title: "Internal Audit", addressIndex: 3 },
];

async function ensureReady() {
  if (ready) return;
  const sql = connection();
  // Created here rather than through a second migration toolchain — the web app
  // owns exactly one table and this keeps drizzle-kit to the indexer.
  await sql`
    create table if not exists people (
      id text primary key,
      name text not null,
      title text not null,
      address_index integer not null unique
    )
  `;
  // Added after the table already existed in some environments; a plain
  // CREATE TABLE above would not backfill it there.
  await sql`alter table people add column if not exists photo text`;
  // Seeded per row, not gated on the table being empty. Gating on "empty"
  // silently skips any default added later — every existing database would
  // keep the three it already had and never gain the fourth.
  for (const person of DEFAULT_PEOPLE) {
    await sql`
      insert into people (id, name, title, address_index)
      values (${person.id}, ${person.name}, ${person.title}, ${person.addressIndex})
      on conflict (id) do nothing
    `;
  }
  ready = true;
}

export function accountFor(persona: Pick<Persona, "addressIndex">) {
  return mnemonicToAccount(DEMO_MNEMONIC, { addressIndex: persona.addressIndex });
}

/** The signing key, derived on demand. Never read from or written to the database. */
export function privateKeyFor(persona: Pick<Persona, "addressIndex">): Hex {
  const key = accountFor(persona).getHdKey().privateKey;
  if (!key) throw new Error(`Could not derive a key for index ${persona.addressIndex}`);
  return `0x${Buffer.from(key).toString("hex")}` as Hex;
}

export async function loadPeople(): Promise<Persona[]> {
  await ensureReady();
  const db = drizzle(connection());
  const rows = await db.select().from(people).orderBy(asc(people.addressIndex));
  return rows.map((row) => ({
    ...row,
    address: accountFor(row).address,
  }));
}

/** Next free HD index, so a new person cannot collide with an existing account. */
export async function nextAddressIndex(): Promise<number> {
  const existing = await loadPeople();
  return existing.reduce((max, p) => Math.max(max, p.addressIndex), -1) + 1;
}

export async function addPerson(input: {
  name: string;
  title: string;
  /** A data URL, already validated and size-capped by the caller. */
  photo?: string | null;
  /**
   * Which HD index to give them.
   *
   * The caller passes this because only the caller can see the chain. Deriving
   * it here from the staff table alone is what broke onboarding: the table is
   * resettable and the chain is not, so after a reset this handed out an index
   * whose address was still registered, and `register` reverted.
   */
  addressIndex?: number;
}): Promise<Persona> {
  await ensureReady();
  const sql = connection();
  const addressIndex = input.addressIndex ?? (await nextAddressIndex());

  const id = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${addressIndex}`;
  const photo = input.photo ?? null;

  await sql`
    insert into people (id, name, title, address_index, photo)
    values (${id}, ${input.name}, ${input.title}, ${addressIndex}, ${photo})
  `;

  return {
    id,
    name: input.name,
    title: input.title,
    addressIndex,
    address: accountFor({ addressIndex }).address,
    photo,
  };
}

/**
 * Undo an `addPerson` whose chain write then failed.
 *
 * The staff record is written first — the chain needs the address it allocates
 * — so a rejected `register` used to leave the row behind. The console then
 * said "nothing has changed" while a person sat in the staff table with no
 * identity on the shared record: precisely the divergence between two stores
 * that this system exists to make impossible.
 */
export async function removePerson(id: string): Promise<void> {
  await ensureReady();
  const sql = connection();
  await sql`delete from people where id = ${id}`;
}

export function personaById(list: Persona[], id: string): Persona {
  const found = list.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown person: ${id}`);
  return found;
}

export function personaByAddress(list: Persona[], address: string): Persona | undefined {
  return list.find((p) => p.address.toLowerCase() === address.toLowerCase());
}
