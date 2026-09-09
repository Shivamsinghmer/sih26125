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

## Clearances and authority are separate

Clearance levels are Restricted, Confidential, Secret and Top Secret — the
ladder the Security Manual for Licensed Defence Industries (DDP, June 2025)
para 5.1.3 applies to documents and equipment alike. Authority to issue, revoke
or inspect is held separately as AccessControl roles on `RoleRegistry`
(`ISSUER_ROLE`, `REVOKER_ROLE`, `AUDITOR_ROLE`), and the console derives what a
person may open from those, never from how highly they are cleared.

Provisioning a real deployment therefore has two steps per person, not one:
grant the clearance they are vetted for, and grant the authority their post
carries. They are different facts and they are revoked independently.

## Known scaffolding, recorded honestly

These are deliberate shortcuts, each already marked in the code:

- ~~**Asset metadata is a placeholder.**~~ *Closed.* A mint now hashes the item's
  name and serial number canonically and anchors that digest in `metadataHash`,
  and a description is only shown when it still matches the token — so an edit
  behind the system's back stops being displayed rather than being displayed as
  though it were true. Specification documents are not hashed in yet; the field
  and the join are there for them.
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
# 0. Secrets. AUTH_SECRET and POSTGRES_PASSWORD have no defaults on purpose:
#    compose refuses to start without them rather than inventing one.
cp .env.example .env && openssl rand -hex 32

# 1. The chain, first and on its own — see below for why it is not in the
#    stack's compose file.
pnpm --filter @sih26125/chain besu:genesis        # validators per department
docker compose -f infra/besu/docker-compose.yml up -d
pnpm --filter @sih26125/contracts hardhat run scripts/deploy.ts --network besu
pnpm --filter @sih26125/chain besu:verify         # the gate holds on Besu

# 2. Everything else: Postgres, the indexer, the console.
docker compose up -d --build
```

The chain is a separate `up` and not an oversight. The four validators are meant
to be held by different departments on different hosts — that is the whole
security claim — so a single file that starts all four beside the console would
be modelling the thing this project argues against. The stack attaches to their
network as an external one instead.

Two things travel by configuration rather than by being built in:

- **Contract addresses.** `deploy.ts` writes `deployments/besu.json`, which is
  per-machine and git-ignored, so it is in no image. Compose mounts it read-only
  and points `DEPLOYMENT_FILE` at it; `DEPLOYMENT_JSON` takes the same contents
  inline where there is nothing to mount. The chain id comes from that file too,
  which is what stops the console signing for Hardhat's 31337 and sending to
  Besu's 26125.
- **The ABIs.** They are Hardhat's compile output, also git-ignored, so both
  images run `hardhat compile` during the build. The interface is built from the
  same artifacts the chain runs, which is the property worth keeping.

### On Vercel

`apps/web/vercel.json` sets the root-directory build; the console then needs
`AUTH_SECRET`, `DATABASE_URL`, `RPC_URL` and `DEPLOYMENT_JSON` as environment
variables, and a Postgres that tolerates serverless connection churn — a pooled
endpoint, not a single instance handed a connection per invocation.

It is worth being clear about what this is and is not. Vercel can host the
console, and for a public demo that is convenient. It cannot host the deployment
this document describes, because a serverless function reaching the chain means
the validators' RPC is on the internet, and a consortium network whose whole
argument is that no single party can rewrite history should not be answering
strangers. The console belongs beside the nodes; that is what the compose file
is for.

The validators are held by different departments — IT Security, Internal Audit,
and two operating divisions — so rewriting history requires collusion across
departments rather than one compromised administrator. That property is the
answer to "why not just a database with an audit table", and it only exists
once the four nodes are genuinely in different hands.
