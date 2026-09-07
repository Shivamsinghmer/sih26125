# From demo to deployment

What is real, what is scaffolding, and exactly what has to change. Written so
that "is this just a demo?" has a precise answer rather than a defensive one.

## What does not change

The part the problem statement is actually about is already deployment-shaped:

- **The five contracts.** The same bytecode that runs on Hardhat has been
  deployed to a four-validator Besu QBFT network and the credential gate holds
  there identically — `pnpm --filter @sih26125/chain besu:verify`.
- **The enforcement.** `AssetToken._update` consults `RoleRegistry` on every
  transfer. No client, script or interface can route around it, which is why
  the demo can afford to be casual about who signs.
- **The audit trail.** Reconstructed from chain events, never from a database.
- **The offline verifier.** A compiled binary that validates a custody bundle
  with the network cable pulled.
- **The DPDP boundary.** Personal data lives in Postgres and never on chain.

## The one that actually matters: key custody

**In the demo the server holds everyone's key.** `people.ts` derives every
account from an HD mnemonic by index, so `walletFor(persona)` can sign as
anybody. `attemptTransferAction` uses this to sign a transfer *as the sender*.

That is fine for a stage demo — it removes wallet popups from the five-step
script — and wrong for a deployment, because a custody system in which the
server can move any asset on anyone's behalf has reintroduced exactly the
central authority the project exists to remove.

**What production does instead.** The mechanism is already built and in use for
sign-in: `keystore.ts` generates and encrypts a key in the holder's own browser,
and `siwe-actions.ts` proves possession by signature. Production extends that
from authentication to authorisation:

| Operation | Demo | Production |
|---|---|---|
| Admin issues/revokes/mints | server signs as admin | unchanged in shape — but the admin's key comes from their own keystore or an HSM, not a shared mnemonic |
| A holder transfers their asset | **server signs as the holder** | the holder signs in their own browser; the console only builds the transaction |
| Onboarding a person | server derives their key from an index | the person generates their own key; the admin registers the address they present |

Concretely, `walletFor()` must stop taking an arbitrary persona and only ever
sign as the authenticated session's own address. `DEMO_MNEMONIC` then has no
production counterpart — there is no seed from which the server can derive
anyone, which is the point.

This is also what makes `GuardianRecovery` meaningful rather than decorative: if
the key is genuinely the person's, losing it is a real event and an m-of-n
quorum is a real answer.

## Demo data that must not ship

| Thing | Where | Change |
|---|---|---|
| Four demo identities auto-seeded | `people.ts` → `DEFAULT_PEOPLE`, inserted in `ensureReady` | Guard on an explicit `SEED_DEMO_DATA` flag, off by default |
| `gate-3 / gate-post-3` terminal | `auth.ts` → `DEFAULT_USERS` | Provision each terminal with a generated credential at install |
| Issuing authority's key printed on the login page | `login/page.tsx` | Already guarded — returns `null` when `NODE_ENV === "production"` |
| "Seed the demo" button, `demo:reset`, `reset-people` | console + package scripts | Remove from the production build |
| Hardhat's published mnemonic as the default | `people.ts` | No default; see key custody above |

## Secrets and configuration

| Variable | Demo default | Production |
|---|---|---|
| `AUTH_SECRET` | dev fallback | **Mandatory** — `session.ts` already refuses to start without it in production |
| `DATABASE_URL` | `postgres:postgres@127.0.0.1` | Real credentials, TLS, not the default superuser |
| `RPC_URL` | `http://127.0.0.1:8545` | The Besu node, over the internal network |
| `DEMO_MNEMONIC` | Hardhat's published seed | Does not exist |

Cookies are already `httpOnly`, `sameSite=lax` and `secure` in production. HTTPS
is required regardless, because the gate scanner's camera needs a secure origin.

## Known scaffolding, recorded honestly

These are deliberate shortcuts, each already marked in the code:

- **Asset metadata is a placeholder.** Every mint writes the same constant hash,
  `0x${"a3".repeat(32)}`. Real assets need their serial number and specification
  documents hashed and that hash anchored — the contract is right, the caller is
  a stub. *This is the most substantive gap in the list.*
- **Photos are base64 in a `text` column** (`people.ts`). Fine for a few dozen
  ID cards, wrong at scale; production puts them in object storage and keeps a
  reference.
- **Sign-in nonces are in memory** (`siwe.ts`). Correct for one process, unsafe
  for several — a nonce could be replayed against another instance. Move to
  Redis or Postgres.
- **The audit view filters in memory** over a full chain replay (`audit.ts`).
  At scale this query belongs in the indexer's Postgres tables, which exist
  precisely so that reading history does not mean replaying it.

## Deploying

```bash
# 1. The chain
pnpm --filter @sih26125/chain besu:genesis        # validators per department
docker compose -f infra/besu/docker-compose.yml up -d
pnpm --filter @sih26125/contracts hardhat run scripts/deploy.ts --network besu

# 2. The database
docker compose -f infra/postgres/docker-compose.yml up -d   # real credentials
pnpm --filter @sih26125/indexer db:push
pnpm --filter @sih26125/indexer start                        # long-running

# 3. The console
pnpm --filter @sih26125/web build
pnpm --filter @sih26125/web start
```

The validators are held by different departments — IT Security, Internal Audit,
and two operating divisions — so rewriting history requires collusion across
departments rather than one compromised administrator. That property is the
answer to "why not just a database with an audit table", and it only exists
once the four nodes are genuinely in different hands.
