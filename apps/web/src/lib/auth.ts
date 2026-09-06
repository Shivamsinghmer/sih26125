import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import postgres from "postgres";

import {
  ROLE_ACCESS,
  ROLE_HOME,
  ROLE_LABEL,
  canAccess,
  type ConsoleRole,
} from "./auth-types";

export { ROLE_ACCESS, ROLE_HOME, ROLE_LABEL, canAccess };
export type { ConsoleRole };

/**
 * Terminal accounts — devices, not people.
 *
 * People do not have rows here. They sign in by proving possession of a key
 * (see `keystore.ts` and `siwe-actions.ts`), and their console role is read
 * from the chain, so revoking an Admin credential also takes away the console
 * with no second place to remember.
 *
 * A gate post is different. It is a fixed device at a door, staffed by whoever
 * is on shift, and issuing every guard a personal key to unlock a shared
 * terminal would be ceremony without security. So the terminal itself is
 * provisioned with a credential, the way a card reader is provisioned today —
 * and that is all this table holds.
 *
 * It is worth being precise about why this is not the thing the project
 * criticises. An editable table of *permissions* would be; a table of device
 * credentials is not. Nothing here grants authority over an asset: the gate
 * view is read-only, and every state change is still gated by the contracts.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/sih26125";

export interface ConsoleUser {
  username: string;
  displayName: string;
  role: ConsoleRole;
}

let client: ReturnType<typeof postgres> | null = null;
let ready = false;

function connection() {
  client ??= postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
  return client;
}

async function hash(password: string, salt: Buffer): Promise<Buffer> {
  return scrypt(password, salt, 64);
}

/**
 * The demo terminal. Its password is weak and published on purpose — hiding it
 * would only make the next person guess. A real deployment provisions each
 * terminal with its own generated credential when the device is installed.
 *
 * There is deliberately no admin or auditor row: those are people, and people
 * sign in with a key.
 */
const DEFAULT_USERS: Array<ConsoleUser & { password: string }> = [
  { username: "gate-3", password: "gate-post-3", displayName: "Gate Post 3", role: "guard" },
];

async function ensureReady() {
  if (ready) return;
  const sql = connection();
  await sql`
    create table if not exists console_users (
      username text primary key,
      display_name text not null,
      role text not null,
      salt text not null,
      password_hash text not null
    )
  `;

  // Two rounds of leftovers to clear, both of which are live credentials that
  // should no longer open anything:
  //   - People used to have password rows. They sign in with a key now.
  //   - The demo terminal was renamed from "guard" to "gate-3".
  await sql`delete from console_users where role <> 'guard' or username = 'guard'`;

  // Seeded per row rather than only when the table is empty. Gating on "empty"
  // silently skips a newly added or renamed terminal whenever any other row
  // survives — which is exactly what happened to gate-3.
  for (const user of DEFAULT_USERS) {
    const salt = randomBytes(16);
    const digest = await hash(user.password, salt);
    await sql`
      insert into console_users (username, display_name, role, salt, password_hash)
      values (${user.username}, ${user.displayName}, ${user.role},
              ${salt.toString("hex")}, ${digest.toString("hex")})
      on conflict (username) do nothing
    `;
  }
  ready = true;
}

/**
 * Check a username and password. Returns null for both "no such user" and
 * "wrong password" — telling them apart would let someone enumerate accounts.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<ConsoleUser | null> {
  await ensureReady();
  const sql = connection();

  const rows = await sql<
    { username: string; display_name: string; role: string; salt: string; password_hash: string }[]
  >`select * from console_users where username = ${username.toLowerCase().trim()}`;

  const row = rows[0];
  if (!row) return null;

  const expected = Buffer.from(row.password_hash, "hex");
  const actual = await hash(password, Buffer.from(row.salt, "hex"));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return {
    username: row.username,
    displayName: row.display_name,
    role: row.role as ConsoleRole,
  };
}
