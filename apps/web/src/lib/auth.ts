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
 * Who may open the console, as opposed to what the chain will let them do.
 *
 * These are two different questions and the system answers them in two
 * different places, deliberately:
 *
 *   - **This file** decides who may load a page. It is ordinary application
 *     auth — a password, a session cookie — because "can this browser see the
 *     admin screen" is a UI concern.
 *   - **The contracts** decide what actually happens. `AssetToken._update`
 *     consults `RoleRegistry` on every transfer regardless of who is logged in,
 *     so a compromised session cannot move an asset to someone uncredentialled.
 *
 * That separation is the point. If logging in were enough to move an asset, the
 * login would be the security control, and we would have rebuilt the
 * centralised system this project exists to replace.
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
 * Demo accounts. Passwords are weak and published on purpose — this is a
 * hackathon demo, and pretending otherwise by hiding them would only make the
 * next person guess. A real deployment seeds no default accounts at all and
 * provisions the first administrator out of band.
 */
const DEFAULT_USERS: Array<ConsoleUser & { password: string }> = [
  { username: "admin", password: "admin123", displayName: "S. Raghavan", role: "admin" },
  { username: "guard", password: "guard123", displayName: "Gate Post 3", role: "guard" },
  { username: "auditor", password: "auditor123", displayName: "K. Iyer", role: "auditor" },
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

  const existing = await sql`select count(*)::int as count from console_users`;
  if ((existing[0]?.count ?? 0) === 0) {
    for (const user of DEFAULT_USERS) {
      const salt = randomBytes(16);
      const digest = await hash(user.password, salt);
      await sql`
        insert into console_users (username, display_name, role, salt, password_hash)
        values (${user.username}, ${user.displayName}, ${user.role},
                ${salt.toString("hex")}, ${digest.toString("hex")})
        on conflict do nothing
      `;
    }
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
