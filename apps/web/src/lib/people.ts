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
 *     HD wallet, so no private key is ever written to the database. Index 0, 1
 *     and 2 reproduce the three accounts the demo has always used.
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
});

export interface Persona {
  id: string;
  name: string;
  title: string;
  addressIndex: number;
  address: Address;
}

let client: ReturnType<typeof postgres> | null = null;
let ready = false;

function connection() {
  client ??= postgres(DATABASE_URL, { max: 4 });
  return client;
}

/**
 * The people the demo opens with. Inserted only when the table is empty, so
 * anyone added through the console is never overwritten.
 */
const DEFAULT_PEOPLE = [
  { id: "admin", name: "S. Raghavan", title: "Issuing Authority, IT Security", addressIndex: 0 },
  { id: "manager", name: "Priya Menon", title: "Divisional Manager, Radar Systems", addressIndex: 1 },
  { id: "user", name: "Rahul Nair", title: "Technician, Radar Systems", addressIndex: 2 },
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
  const existing = await sql`select count(*)::int as count from people`;
  if ((existing[0]?.count ?? 0) === 0) {
    for (const person of DEFAULT_PEOPLE) {
      await sql`
        insert into people (id, name, title, address_index)
        values (${person.id}, ${person.name}, ${person.title}, ${person.addressIndex})
        on conflict do nothing
      `;
    }
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
}): Promise<Persona> {
  await ensureReady();
  const sql = connection();
  const addressIndex = await nextAddressIndex();

  const id = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${addressIndex}`;

  await sql`
    insert into people (id, name, title, address_index)
    values (${id}, ${input.name}, ${input.title}, ${addressIndex})
  `;

  return {
    id,
    name: input.name,
    title: input.title,
    addressIndex,
    address: accountFor({ addressIndex }).address,
  };
}

export function personaById(list: Persona[], id: string): Persona {
  const found = list.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown person: ${id}`);
  return found;
}

export function personaByAddress(list: Persona[], address: string): Persona | undefined {
  return list.find((p) => p.address.toLowerCase() === address.toLowerCase());
}
