/**
 * Reset the people table to the three demo identities.
 *
 *   pnpm --filter @sih26125/web reset:people
 *
 * `demo:reset` redeploys the contracts, which means every DID registered
 * against the previous deployment is gone. Anyone onboarded through the console
 * before that reset would survive here as a row pointing at an identity the new
 * IdentityRegistry has never heard of — showing up in the console as a person
 * who is permanently "Not yet registered". Harmless in principle, confusing in
 * front of a judge.
 *
 * This deliberately deletes personal data. That is the correct behaviour for a
 * demo reset and precisely the wrong behaviour anywhere else, which is why it
 * lives in a script with this name rather than inside application code.
 *
 * It writes the defaults back itself rather than leaving that to the lazy
 * `ensureReady()` path in people.ts: that function caches a module-level flag,
 * so a server process that has already run it will never reseed after an
 * external delete. A reset has to leave the database in the known-good state on
 * its own, not depend on what another process happens to have cached.
 *
 * Postgres being down is not a failure here — the chain half of a reset is
 * still worth doing on its own, so this warns and exits cleanly.
 */
import postgres from "postgres";

import { DEFAULT_PEOPLE } from "../src/lib/people";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/sih26125";

const sql = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 5,
  // The DDL below is deliberately idempotent, so Postgres emits "already
  // exists, skipping" notices every run. They are the expected case, not
  // information — printing them buries the one line that matters.
  onnotice: () => {},
});

try {
  await sql`
    create table if not exists people (
      id text primary key,
      name text not null,
      title text not null,
      address_index integer not null unique
    )
  `;
  await sql`alter table people add column if not exists photo text`;

  const existing = await sql`select count(*)::int as count from people`;
  const before = existing[0]?.count ?? 0;

  await sql`delete from people`;
  for (const person of DEFAULT_PEOPLE) {
    await sql`
      insert into people (id, name, title, address_index)
      values (${person.id}, ${person.name}, ${person.title}, ${person.addressIndex})
    `;
  }

  console.log(
    `people reset — ${before} row(s) cleared, ${DEFAULT_PEOPLE.length} demo identities restored`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.warn(`people not reset (${message}) — is Postgres running?`);
} finally {
  await sql.end({ timeout: 5 });
}
