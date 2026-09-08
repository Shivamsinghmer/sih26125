import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  /**
   * Only the indexer's own tables.
   *
   * `people` and `console_users` live in this same database but belong to the
   * console, which creates them itself. Without this filter a push compares the
   * whole database against a schema that does not mention them and offers to
   * drop them — that is the personal data the DPDP separation exists to protect,
   * one unattended confirmation away from deletion.
   *
   * Scoped like this, the worst a push can do is drop the index, which the
   * indexer rebuilds from block zero on its next start.
   */
  tablesFilter: [
    "chain_events",
    "assets",
    "role_grants",
    "identities",
    "indexer_state",
  ],
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@127.0.0.1:5432/sih26125",
  },
} satisfies Config;
