import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * The index is a cache, never the source of truth.
 *
 * Every table here is derived from chain events and can be dropped and rebuilt
 * from block zero. That is not a nice-to-have: an auditor's answer must be
 * reproducible from the chain, so anything this database could tell you that
 * the chain could not is a bug. The console's audit view deliberately reads the
 * chain directly for exactly this reason; these tables exist for querying at
 * scale, not for deciding what is true.
 */

/** Every decoded event, in order. The raw material for every projection below. */
export const chainEvents = pgTable(
  "chain_events",
  {
    id: serial("id").primaryKey(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    logIndex: integer("log_index").notNull(),
    transactionHash: text("transaction_hash").notNull(),
    contract: text("contract").notNull(),
    eventName: text("event_name").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    // A reindex must be idempotent, so the chain's own identifier for a log is
    // the natural key rather than the serial id.
    uniqueLog: unique("chain_events_log_key").on(table.transactionHash, table.logIndex),
    byBlock: index("chain_events_block_idx").on(table.blockNumber, table.logIndex),
  }),
);

/** Current custody, projected from AssetMinted and Transfer. */
export const assets = pgTable("assets", {
  tokenId: text("token_id").primaryKey(),
  owner: text("owner").notNull(),
  requiredRole: integer("required_role").notNull(),
  metadataHash: text("metadata_hash").notNull(),
  mintedAt: timestamp("minted_at", { withTimezone: true }).notNull(),
  updatedAtBlock: bigint("updated_at_block", { mode: "number" }).notNull(),
});

/** Current credential state, projected from BusinessRoleGranted/Revoked. */
export const roleGrants = pgTable(
  "role_grants",
  {
    account: text("account").notNull(),
    role: integer("role").notNull(),
    expiry: bigint("expiry", { mode: "number" }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    updatedAtBlock: bigint("updated_at_block", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: unique("role_grants_key").on(table.account, table.role),
  }),
);

/** DID bindings, projected from IdentityRegistered and IdentityKeyRotated. */
export const identities = pgTable("identities", {
  account: text("account").primaryKey(),
  did: text("did").notNull(),
  registeredAtBlock: bigint("registered_at_block", { mode: "number" }).notNull(),
});

/** How far the indexer has caught up, so a restart resumes instead of replaying. */
export const indexerState = pgTable("indexer_state", {
  id: integer("id").primaryKey(),
  lastBlock: bigint("last_block", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
