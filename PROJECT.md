# SIH26125 — Blockchain-Based Secure Platform for Identity, Access Control and Digital Asset Management

> Reference document for anyone — human or AI — working in this repository.
> Read this before writing code. It records not just *what* the system is, but *why*
> each decision was made, so that decisions already settled are not relitigated.

---

## 1. The problem

**Smart India Hackathon 2026, problem statement SIH26125.**

| Field | Detail |
|---|---|
| Problem Statement ID | SIH26125 |
| Organisation | Bharat Electronics Limited (BEL) — Navratna defence PSU |
| Ministry | Ministry of Defence |
| Theme | Blockchain & Cybersecurity |
| Category | Software |
| Dataset provided | None — all demo data is self-generated |
| Submission deadline | 30 September 2026 |

### The core problem, in one sentence

> A large organisation cannot prove three things at the same time — **who a person is**,
> **what they are allowed to do**, and **what they own or hold custody of** — and it
> cannot prove that the record of all three was not quietly edited by the same
> administrator who manages it.

### Why this happens today

1. **Identity is issued by a central authority.** Active Directory / LDAP decides who exists. Compromise the directory and every identity falls at once. Nobody outside BEL can verify a BEL identity without asking BEL and trusting the answer.
2. **Permissions are granted by an unaudited administrator.** The person guarding the system and the person who could abuse it are the same person. Most insider breaches in large organisations happen this way — legitimate privileges used illegitimately.
3. **Asset ownership lives in a different system entirely.** Identity grew out of IT; asset registers grew out of finance or a shared spreadsheet. There is no cryptographic link between "Employee 4417" and "Signal Analyser SN-8823" — only a database row that says so.
4. **The audit log is protected by policy, not mathematics.** An append-only trigger can be dropped by the same administrator whose actions it records. A signed row can be re-signed.
5. **Access accumulates and is never removed.** Reviews add access; they rarely remove it. Offboarding is a manual checklist someone has to remember.
6. **Ownership history resets at every handover.** Chain of custody gets reconstructed later from emails and gate passes. For controlled defence equipment, a broken chain is a security failure, not a paperwork failure.

### The five deliverables BEL named

The architecture diagram should have exactly these five boxes, and the demo should hit them in order.

| # | Deliverable | What it means in practice |
|---|---|---|
| 1 | **Decentralised Identifiers (DIDs)** | Every user gets a self-sovereign, cryptographically verifiable identity that works without a central authority vouching for it |
| 2 | **NFT-based asset ownership** | Each asset becomes a unique, non-duplicable token, permanently recorded and directly linked to a user DID |
| 3 | **Smart-contract governance** | Only authorised administrators can mint and assign assets; all rules for creation, allocation, transfer and validation are enforced in code |
| 4 | **Role-Based Access Control** | Four roles — **Admin, Manager, Auditor, User**. Use these exact names. Enforced automatically at every operation |
| 5 | **Immutable audit trail** | Identity creation, minting, allocation, rights assignment, ownership transfers and permission updates are all permanently recorded |

### How teams misread this PS — avoid all four

- ❌ **Building an NFT marketplace.** The word "NFT" pulls teams toward art, prices and trading. This is enterprise asset custody — no buyers, no listings, no marketplace.
- ❌ **Shipping "Login with MetaMask" and calling it a DID.** A wallet address is not a decentralised identifier, and a BEL judge will know the difference.
- ❌ **Enforcing roles in the frontend.** If the permission check lives in React and not in the smart contract, you have rebuilt the centralised system the PS asks you to replace.
- ❌ **Putting employee personal data on chain.** This breaks India's DPDP Act 2023 and reads as inexperience.

---

## 2. The idea

### The pitch sentence

Say it on slide 1, during the demo, and on the last slide:

> **"Ownership, permission and history become one cryptographic object that no administrator can rewrite."**

### The core insight

There are good identity products. There are good token standards. **Nobody joins them so that the token itself refuses to move unless the receiver holds a valid role credential.**

- Identity platforms (Microsoft Entra Verified ID, Hyperledger Aries, Privado ID) stop at **issuing the credential**.
- Token standards (ERC-721, and even ERC-3643 for regulated securities) stop at **the transfer**.
- This system makes **the transfer conditional on the credential**.

That single design decision is the demo, the differentiator, and the answer to "what is new here?"

### Four features that make this win

| Feature | Why it matters |
|---|---|
| **Credential-gated transfers** | The ERC-721 `_update` hook reads the receiver's role from an on-chain registry and reverts if it is missing, expired or revoked. On stage you demonstrate this by watching a transaction fail. The most convincing twenty seconds you can put in front of a judge. |
| **Selective disclosure** | A contractor proves "I hold a Contractor Level 2 credential" without revealing name, employer or ID number, using SD-JWT. Directly relevant to a defence supply chain where the *fact* of a relationship can itself be sensitive. |
| **Guardian-based key recovery** | If someone loses their key, an m-of-n quorum of guardians (department head, HR, security officer) rotates the signing key while the DID and every asset link stay intact. No enterprise will accept seed phrases; almost no competing team will have solved this. |
| **Deterministic offline verifier** | A single binary that verifies a complete chain of custody with the network cable pulled. This is what turns a dApp into a defence product. |

### Why this matters beyond BEL

The same three primitives — verifiable identity, tokenised custody, contract-enforced permission — serve police asset registers (SIH26190 from NCRB), hospital equipment tracking, and land records. There is also an official deployment path: **MeitY's Vishvasya Blockchain Technology Stack** offers government Blockchain-as-a-Service on geographically distributed infrastructure, with NBFLite as a sandbox. Stating that the platform deploys onto Vishvasya is a strong signal that very few competing teams will know to make.

---

## 3. Architecture

### The seven things the system does

| Step | What happens | Where it lives |
|---|---|---|
| 1 | **Identity issuance** — an admin creates a DID for a person. The DID document holds a public key and nothing personal. | `IdentityRegistry.sol` + `packages/identity` |
| 2 | **Credential issuance** — the admin issues a W3C Verifiable Credential stating the subject holds a role, with a validity period. | `RoleRegistry.sol` + `packages/identity` |
| 3 | **Asset registration** — an asset is minted as an ERC-721 and assigned to a DID. Only an issuer-role holder can mint. | `AssetToken.sol` |
| 4 | **Enforcement** — every transfer calls into the role registry and reverts if the receiver lacks a valid role. **This is the heart of the system.** | `AssetToken._update` |
| 5 | **Revocation** — one on-chain write removes access for every verifier, including offline ones. | `RoleRegistry.revokeBusinessRole` |
| 6 | **Audit** — an auditor view replays every event, in order, from chain events alone. | `packages/indexer` + auditor UI |
| 7 | **Offline verification** — a CLI binary validates an exported record bundle with no network access. | `apps/verifier` |

### Contracts

| Contract | Responsibility | Status |
|---|---|---|
| `IdentityRegistry.sol` | Maps DID → account address, holds status (Active / Suspended / Retired). No personal data. | ✅ Built |
| `RoleRegistry.sol` | Role grants with expiry, revocation, separation-of-duties constraints. **Deliberately separate from the asset contract.** | ✅ Built |
| `AssetToken.sol` | ERC-721 for assets. The `_update` hook calls RoleRegistry on every transfer. Batch reassignment for offboarding. | ✅ Built |
| `CredentialStatus.sol` | Anchors the W3C Bitstring Status List so revocation is one bit and verification is cheap. | ⬜ Not yet built |
| `GuardianRecovery.sol` | m-of-n guardian quorum to rotate a lost signing key, with a time-lock and mandatory notification event. | ⬜ Not yet built |

### 🔴 The design rule that will save you on stage

**Keep `RoleRegistry` in a SEPARATE contract from `AssetToken`.**

A judge is very likely to ask: *"an employee resigns today — revoke their access and reassign their twelve assets in one operation, and show me the audit trail proves it."*

If roles live inside the token contract, that request becomes a migration and you cannot do it live. Because they are separate, `batchReassign(from, to, tokenIds[])` guarded by a role check is about fifteen lines — and you can write it in front of them. It is already implemented in `AssetToken.sol`.

---

## 4. Technology stack

Everything is JavaScript or TypeScript, with Solidity for the contracts. **There is no Python anywhere in the running system**, and deliberately **no machine-learning component** — adding an unnecessary "AI/ML module" to the architecture diagram is a recognised red flag with technical judges.

One monorepo, one language, one deployment — which is also a good answer when a judge asks how a six-person team shipped this in two days.

| Layer | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Shared TypeScript types across contracts, API and UI. Real dependency graph (ABIs flow from contracts into everything else), so topological builds and caching earn their keep. |
| Language | TypeScript, strict mode | Types catch the mistakes you would otherwise find during the demo |
| Blockchain node | Hyperledger Besu, private QBFT | EVM-compatible, permissioned, zero gas price. Run via Docker — you never write Java. |
| Local development | Hardhat Network / Anvil | Instant blocks and restarts. Deploy the same bytecode to Besu at the end. |
| Contracts | Solidity 0.8.28 + Hardhat | Hardhat's tooling and tests are TypeScript |
| Contract libraries | OpenZeppelin v5 | Audited ERC-721 and AccessControl. Note: v5 uses the `_update` hook. |
| Chain access | viem | Fully typed — your ABI becomes TypeScript types automatically |
| Identity / credentials | `did-jwt-vc` + a hand-written offline `did:ethr` resolver | The Phase 0 spike skipped Veramo — went straight to the libraries it wraps. ~200 lines, no agent/plugin layer, fully explainable under Q&A. See §6. |
| Selective disclosure | `@sd-jwt/core` | Prove a role without revealing identity attributes |
| Database | Postgres + **Drizzle** | Typed queries, no codegen step, `drizzle-kit push` fits an hourly-changing schema |
| Front end | Next.js + Tailwind v4 + shadcn/ui + wagmi | Admin console, employee view and auditor explorer, built quickly and looking finished |
| Offline verifier | Bun `--compile` single binary | No runtime install needed on the target machine |
| Demo data | `@faker-js/faker` | Generates the org chart and asset catalogue |
| Testing | Hardhat/Chai (contracts), Vitest, Playwright | Playwright records the demo flow so it cannot break silently |

### Repository layout

```
packages/contracts   Solidity sources, Hardhat config, TypeScript tests, deploy scripts
packages/identity    DID creation, credential issuance and verification (did-jwt-vc, offline resolver)
packages/chain       Contract ABIs, revert-to-sentence decoder, the CLI demo/staging scripts
packages/custody     Custody bundle format: sign, verify, canonical digest — no chain access
packages/indexer     viem event listener writing chain events into Postgres  [Bun]
apps/web             Next.js — admin console, auditor replay, onboarding, AND all API routes
apps/verifier        Offline CLI verifier, compiled to a single binary       [Bun]
infra/besu           genesis.json and docker-compose for the 4-node QBFT network
infra/postgres       docker-compose for the indexer's and console's database
docs/                DESIGN.md, design-tokens.json, theme.css
```

### Runtime split — and why there is no `apps/api`

The original plan had a separate Fastify API service. **It was removed.** Next.js Route Handlers run as plain Node functions and can do everything Fastify would have done here — admin operations, credential issuance, indexer queries. Collapsing it removes a whole service, the CORS boundary, a second dev server, and one more thing that can be half-running during the demo.

| Piece | What it is | Runtime |
|---|---|---|
| `apps/web` | Next.js — UI **and** API routes | **Node** (Next.js default) |
| `packages/indexer` | Standalone daemon: chain events → Postgres | **Bun** |
| `apps/verifier` | Compiled offline CLI | **Bun** |

The indexer and verifier stay separate **not** because of framework preference but because of what they are: the indexer is a persistent process that must keep running whether or not anyone has loaded a page, and the verifier is not a service at all. Everything still lives in one monorepo.

### A note on Hyperledger Besu and Java

Besu is written in Java, but **the team never writes or reads Java**. Besu is a program you run, the same way Postgres is a program you run without writing C. The interaction is over standard JSON-RPC. The team touches exactly two Besu artefacts, neither of which is code:

1. A **genesis JSON** file — chain ID, validator addresses, gas configuration. Configuration, not programming.
2. A **docker-compose** file that starts four Besu containers forming a QBFT network.

No JDK is installed and no `.java` file is ever opened.

⚠️ **The genesis must enable `cancunTime`.** OpenZeppelin v5.5+ uses the `mcopy` opcode, so `hardhat.config.ts` compiles with `evmVersion: "cancun"`. A Besu genesis that stops at Shanghai will reject this bytecode.

---

## 5. Which chain: Ethereum or Solana?

> **Recommendation:** Use the Ethereum family (EVM), specifically a **private permissioned EVM network** — Hyperledger Besu with QBFT consensus. Do not use Solana. Do not use a public network of any kind.

### First, the more important point: not a public chain at all

The question "Ethereum or Solana" usually means "which public network". For this problem statement the answer to that is **neither**, and being clear about why is itself a scoring point.

- **Air-gap.** A defence PSU deployment may sit in a facility with no internet. A public chain is unreachable there by definition.
- **Confidentiality.** Even hashed, a public record of how many assets a defence organisation moves and when is a metadata leak worth avoiding.
- **Cost and dependency.** Paying transaction fees in a volatile foreign-listed token, to a network India does not control, will not pass a procurement review.
- **Permissioning.** BEL needs to control who can even join the network. Public chains are open by design — that is their whole value proposition, and it is exactly wrong here.

### If we must choose an ecosystem, Ethereum wins clearly

| Criterion | Ethereum / EVM | Solana |
|---|---|---|
| Can it run privately? | Yes. Besu, Nethermind, Geth all support private permissioned networks with named validators and on-chain permissioning of who may join. | Not practically. Designed as a single global network; no supported permissioned-deployment story. |
| Language fit | Solidity contracts, TypeScript everywhere else. Hardhat tests are `.ts`, viem gives typed contract calls. | Programs are Rust with Anchor. Breaks our JS/TS stack and adds a language nobody is fluent in during a 36-hour build. |
| Identity standards | `did:ethr`, ERC-725/735, ERC-3643, Ethereum Attestation Service. Veramo supports these directly. | No comparable DID method ecosystem. You would be inventing the identity layer from scratch. |
| Asset tokens | ERC-721 with a transfer hook — the exact primitive this PS needs, with audited OpenZeppelin implementations. | SPL Token-2022 transfer hooks are real, but ecosystem, examples and audited libraries are far thinner. |
| Key recovery | ERC-4337 smart accounts give guardian recovery as a standard pattern with TypeScript libraries. | Achievable with multisig programs (Squads), but no equivalent standard — you build more yourself. |
| Transaction fees | Zero on a private network. Gas price set to 0 in genesis. Nothing to explain to a procurement officer. | Always non-zero, plus account rent. Awkward inside a government organisation. |
| Government alignment | MeitY's Vishvasya national blockchain stack is built on the Hyperledger family. | No Indian government blockchain initiative uses Solana. |
| Where Solana genuinely wins | — | Very high throughput, very low fees, sub-second finality. **All irrelevant here** — this workload is tens of thousands of events per *day*, not per second. |

### The prepared answer for a judge

> "We use the EVM as a standard, but not a public Ethereum network. The deployment is a private Hyperledger Besu network with QBFT consensus and validators held by different departments — IT Security, Internal Audit and two operating divisions — so rewriting history requires collusion across departments rather than one administrator. Gas price is zero, membership is permissioned, and the whole thing runs inside an air-gapped facility. We considered Solana and rejected it: it has no practical permissioned deployment model, its programs are written in Rust which breaks our stack, and there is no mature DID standard for it. The properties Solana is excellent at — throughput and low public fees — are not properties this workload needs."

---

## 6. Settled decisions — do not relitigate

These were debated and closed. Each records *why*, so edge cases can be judged rather than re-argued.

### Veramo — timeboxed, with a concrete fallback

Confirmed actively maintained: **v7.0.0 shipped 11 February 2026**, with v6.0.1/6.0.2 in mid-January 2026. The risk is not abandonment — it is ESM-only packaging friction against Hardhat's CJS-flavoured pieces.

**The rule:** give Veramo a **4-hour spike, one person, in Phase 0**. Success criterion is narrow — issue a role credential, verify it, revoke it. If it fights past 4 hours, drop straight to `did-jwt-vc` + `ethr-did-resolver`, which are the libraries Veramo wraps anyway. You lose the agent abstraction and gain ~200 lines you fully understand — a better position under Q&A, because you can explain every step of credential verification instead of saying "Veramo does it."

*No judge scores you on which library issued the credential.*

### Besu — real deployment or an honest answer, never theatre

Build 100% on Anvil/Hardhat. Stand up real Besu in **Phase 5 as a separate half-day-timeboxed track**, one owner. The genesis ceremony (`besu operator generate-blockchain-config` plus a JSON) is roughly 2 hours for someone who has read the docs once.

❌ **Do not simulate QBFT multi-validator behaviour on Anvil.** A "simulation" on a dev chain is not a deployment story, it is a costume — and if a judge probes it you have spent credibility to save two hours. Either run real Besu, or say plainly: *"Anvil is our dev chain, Besu is the deployment target, here's the genesis config and the topology."* Honesty scores better.

### Drizzle over Prisma

Six tables, almost no relational complexity, schema changing hourly. Prisma's relational DX advantage does not pay off at that size, and its client-generation step is real friction in a Turborepo hot loop. `drizzle-kit push` is the hackathon workflow. No engine binary.

### ERC-4337 — dropped; build guardian recovery directly

Full 4337 needs an EntryPoint deployment, a bundler (Alto/Rundler/Skandha) and a paymaster or prefunded accounts. **On a zero-gas permissioned chain, most of 4337's value evaporates** — paymasters and gas abstraction solve problems this system does not have.

What is actually wanted is guardian recovery: a smart-contract wallet with an owner key and an m-of-n rotate function. ~80 lines of Solidity, no bundler, no mempool, no EntryPoint, and readable aloud to a judge.

**The framing that keeps credibility:** *"The recovery module is designed to be ERC-4337 compatible, but we didn't run a bundler — on a zero-gas permissioned chain it adds infrastructure without adding capability."* That is stronger than "we use ERC-4337", because it shows you understood the standard well enough to know which half applies.

### Bun for the verifier — and deprioritise the binary

`pkg` is archived (January 2024; its README points at Node's native SEA). `@yao-pkg/pkg` is the working fork but more setup than Bun. `bun build --compile` is one command. Caveats: ~50–90 MB output, and check the crypto path works under Bun's `node:crypto` shim.

**The bigger point:** the binary is polish, not substance. `node verify.js` on a laptop with the cable pulled demonstrates exactly the same thing. Build the verifier logic in Phase 3, compile it in Phase 5 if there is time, and do not let packaging eat an hour you needed for the demo.

### Frontend: Next.js over TanStack Start

TanStack Start is arguably the better architectural fit — this is a client-heavy dashboard that barely uses RSC, so Next's server/client boundary tax buys little. But the team's frontend builder already knows Next.js, **and** Next.js has the deeper trench of prior art for wagmi + shadcn/ui specifically. Familiarity and ecosystem depth point the same way.

---

## 7. Two demo-critical implementation details

These are not in the original planning document and matter more than most of the stack decisions.

### 🔴 The revert has to look good

The entire demo peaks on **a transaction failing** — and failed transactions are ugly by default. Nobody plans this, and it is the single highest-leverage ~90 minutes of frontend work in the project.

**What is already done:** the contracts use Solidity **custom errors, not `require` strings**, so viem can decode them cleanly. `AssetToken` throws one of three, each carrying the data the UI needs:

```solidity
error TransferBlockedRoleNeverGranted(address recipient, RoleRegistry.Role requiredRole);
error TransferBlockedRoleRevoked(address recipient, RoleRegistry.Role requiredRole);
error TransferBlockedRoleExpired(address recipient, RoleRegistry.Role requiredRole, uint64 expiredAt);
```

**What the UI must do:** catch the revert, decode the custom error with viem, and render something like:

> **Transfer blocked** — recipient does not hold a valid Manager credential (expired 12 Aug 2026).

Never show a raw revert string or a hex selector. The expiry timestamp is carried in the error precisely so the message can name the date. Style per `docs/DESIGN.md` § "The one deliberate deviation: error state".

### 🔴 OpenZeppelin v5's `_update` fires on mint and burn

`_update` is called for mints (`from == address(0)`) and burns (`to == address(0)`) as well as ordinary transfers. **If the role check does not special-case those, minting reverts** — and the failure looks like a permissions bug rather than a hook bug, which is how it eats an hour.

This is handled in `AssetToken._update`, and the exemption is covered by the first three tests in `AssetToken.test.ts`, written before anything else on purpose.

---

## 8. Build plan

All six phases are functionally complete and verified — not merely written — as of this
commit. What "verified" meant for each is recorded here so the evidence is not lost
once the code looks finished.

| Phase | Focus | Status |
|---|---|---|
| **Phase 0** | Research and decisions | ✅ **Done.** Veramo spike resolved to "skip it" within the 4-hour box — `packages/identity` went straight to `did-jwt-vc` + `ethr-did-resolver`, the libraries Veramo wraps. ~200 lines, fully explainable under Q&A. |
| **Phase 1** | Contracts | ✅ **Done — 48 tests passing.** Five contracts (`IdentityRegistry`, `RoleRegistry`, `AssetToken`, `CredentialStatus`, `GuardianRecovery`), including the unauthorised-transfer-reverts test and the mint/burn `address(0)` exemption test, written first as the design rule required. |
| **Phase 2** | Identity service | ✅ **Done.** `issueRoleCredential` / `verifyRoleCredential` issue and verify a role credential with no network access — proven by resolving a `did:ethr` identifier from the string alone. Revocation is observable via `RoleRegistry.checkRole`'s `InvalidReason`. |
| **Phase 3** | Indexer | ✅ **Done, verified against real Postgres.** All five tables created via `drizzle-kit push`; a seeded chain indexed correctly; the index was `TRUNCATE`d to zero rows and rebuilt — **byte-for-byte identical** to the pre-truncate snapshot. Live following (not just backfill) confirmed by revoking a credential and watching the running daemon pick it up. |
| **Phase 4** | Interfaces | ✅ **Done.** Admin console (issue / revoke / mint / onboard), the blocked-transfer decode, and the auditor replay all functional end to end in a browser. Onboarding a new person writes personal data to Postgres and only a DID to the chain — verified by adding "A. Krishnan" and confirming the `people` table holds no private key. |
| **Phase 5** | Hardening | ✅ **Done.** Guardian recovery's cancel-during-timelock path is tested (a colluding quorum cannot recover an account whose owner is still watching). The verifier binary (`bun build --compile`, 95MB) was run standalone with the chain process killed first — `curl` returned connection-refused, the binary still returned `VERIFIED`. A forged bundle was caught by two independent checks. Besu: four QBFT validators (one per named department) produce blocks on the 2s period, and the identical bytecode used on Hardhat deploys and reverts identically — `pnpm --filter @sih26125/chain besu:verify`. |
| **Phase 6** | Demo | ✅ **Scripted spine done and timed; live rehearsal is a team task, not a code one.** `pnpm --filter @sih26125/chain demo` runs all five steps end to end in **under 3 seconds**. The 6-test Playwright suite (`pnpm e2e`) asserts each beat against the real console and is self-resetting, so it can be re-run before the final without inheriting stale chain state. What remains is a human rehearsing the narration over the UI to fit the five-minute slot — that part cannot be verified by a script. |

### The five-step demo script

1. Admin creates a decentralised identity and issues a **Manager** role credential to a new employee. Thirty seconds, live.
2. Admin mints an asset NFT — a believable item such as a signal analyser with a realistic serial number — and assigns it to that identity.
3. The employee attempts to transfer the asset to a colleague who holds only the **User** role. **The transaction reverts on chain, visibly. Pause here and let it land.**
4. Admin revokes the Manager credential. The same transfer now fails for the original holder too, proving revocation propagates.
5. Auditor view replays the entire history. Then **unplug the network cable** and run the offline verifier on an exported record — it still validates.

### Team allocation

| Role | People | Owns |
|---|---|---|
| Solidity + Hardhat | 2 | Role registry, asset contract, transfer hooks, TypeScript tests |
| Backend (Node/TS) | 1 | Besu network, Veramo identity service, credential issuance, event indexer |
| Frontend (Next.js) | 1 | Admin console, employee view, auditor explorer |
| Security / applied crypto | 1 | Key lifecycle, selective disclosure, offline verifier, threat model |
| Design + pitch | 1 | UX, deck, demo choreography, judge Q&A preparation |

**There is deliberately no machine-learning role.** This problem statement does not need one.

---

## 9. Risks and prepared answers

| Risk | Mitigation |
|---|---|
| *"Why not just a database with an audit table?"* | An append-only table is append-only only while the administrator keeps it so. The DBA who can grant themselves a role can drop the trigger, edit the row and re-sign it. A multi-node network with validators in different departments moves integrity outside any one administrator's control. Also — the audit record here is not a log *about* the transaction, **it is the transaction**, so they can never disagree. |
| *"Where do private keys live?"* | Identities are smart-contract accounts, not raw keypairs. Recovery is an m-of-n guardian quorum with a time-lock and a mandatory notification event, so recovery cannot be abused as a silent takeover. |
| *"What about DPDP compliance?"* | No personal data on chain — only DIDs, public keys, status bits and salted hashes. On an erasure request, the off-chain record is deleted and the salt rotated, so the on-chain hash becomes an irreversible orphan. |
| *"What about post-quantum?"* | Hash-anchored records survive a quantum adversary; signature schemes are rotatable. Have a one-line migration answer ready — **do not over-claim**. |
| Demo fails on venue network | The entire system runs locally. This PS has no external dependency at all, which is precisely why it was chosen. |
| AI-generated contract contains an admin-grants-itself-everything flaw | Every contract is read line by line by a human before the final, with the access-control graph drawn on paper. **If we cannot explain our own permission structure on a whiteboard, we lose the round regardless of the demo.** |
| *"Who physically issues the ID card / uploads the photo?"* | Deliberately out of scope, for the same reason a photo never touches the chain: it is personal data, more re-identifying than a name, and the system's job is to authenticate a credential, not manufacture one. `IdentityRegistry.Identity` holds only `did`, `status` and `registeredAt` — no name, no photo. Printing and photo capture stay an administrative process (HR / IT Security), exactly as today; a photo would live as a file in Postgres keyed to the `people` row, never referenced on chain even by hash. |
| *"How does a guard know the card belongs to the person holding it?"* | Two checks, deliberately not one. **(1) Face matches card** is solved the way a passport already solves it — the photo is printed on the card, the guard compares it to the person in front of them, no lookup involved. **(2) The credential is currently valid** is the chain question: the card's QR encodes only the `did:ethr:<chainId>:<address>` — no name, safe to expose — and a scanner resolves it against `RoleRegistry.checkRole` and, for asset custody specifically, `AssetToken.ownerOf(tokenId)`. The blockchain was never meant to prove a face; it proves an authorization, the same separation Aadhaar makes between a biometric match and an authorization database. Not yet built as a console screen — the logic is a straight read of contracts already deployed, so it is a fast add if a live demo of it is ever needed. |

---

## 10. Working in this repo

### Commands

```bash
pnpm install                    # install everything

pnpm build                      # turbo: build all packages in dependency order
pnpm test                       # turbo: run all tests — 97 across five packages
pnpm typecheck                  # turbo: typecheck everything — 11 tasks
```

```bash
# Local chain — the daily loop
pnpm --filter @sih26125/contracts node          # Hardhat Network on :8545
pnpm --filter @sih26125/contracts deploy:local  # deploy all five contracts
pnpm --filter @sih26125/chain demo              # the five-step script, scripted end to end
pnpm --filter @sih26125/chain seed              # just the opening state, for the console

pnpm e2e                         # from repo root: redeploy + reseed + run the 6-test Playwright suite
```

```bash
# Postgres — for the indexer and the console's people table
docker compose -f infra/postgres/docker-compose.yml up -d
pnpm --filter @sih26125/indexer db:push         # create the tables
pnpm --filter @sih26125/indexer start           # the daemon — leave it running

# Besu — the deployment target, not the daily loop
pnpm --filter @sih26125/chain besu:genesis      # regenerate genesis + validator keys
docker compose -f infra/besu/docker-compose.yml up -d
pnpm --filter @sih26125/contracts hardhat run scripts/deploy.ts --network besu
pnpm --filter @sih26125/chain besu:verify       # confirm the gate holds on the real target
```

```bash
# The offline verifier
pnpm --filter @sih26125/chain export -- 1                 # export asset #1's custody bundle
pnpm --filter @sih26125/verifier build                     # compile to dist/sih-verify(.exe)
pnpm --filter @sih26125/verifier dev asset-1-custody.json  # or run straight from source
```

### Conventions

- **TypeScript strict everywhere.** `noUncheckedIndexedAccess` is on.
- **Solidity: custom errors, never `require` strings.** The UI decodes them; see § 7.
- **Never put personal data on chain.** DIDs, public keys, status bits and salted hashes only. Names, employee numbers and departments live in Postgres.
- **The Postgres index is a cache.** It must be rebuildable from chain events at any time, so it is never the source of truth.
- **Enforce permissions in the contract, never in the UI or an API route.** An API-route check is a convenience for the user, not a security control.
- **Roles are `Admin`, `Manager`, `Auditor`, `User`** — the exact names from the problem statement. The `RoleRegistry.Role` enum is `None, User, Auditor, Manager, Admin` (ordinals 0–4).

### Two role systems — don't confuse them

This trips people up. There are two separate access-control layers:

1. **OpenZeppelin `AccessControl` roles** (`ISSUER_ROLE`, `REVOKER_ROLE`, `DEFAULT_ADMIN_ROLE`) — *technical* roles gating **who may call a contract function** (who can mint, who can revoke).
2. **`RoleRegistry.Role` business roles** (`Admin`, `Manager`, `Auditor`, `User`) — the *organisational* roles from the problem statement, gating **who may hold or receive an asset**.

`AssetToken.mint` is gated by (1). `AssetToken._update`'s transfer check consults (2).

### Design system

`apps/web` follows the **Steep** style reference:

- `docs/DESIGN.md` — full style guide, component specs, do's and don'ts, plus the SIH-specific mapping and the deliberate error-state deviation
- `docs/design-tokens.json` — W3C design tokens
- `docs/theme.css` — Tailwind v4 `@theme` block and `:root` variables, ready to copy into `apps/web/src/app/globals.css`

Signifier and Sohne are commercial fonts; substitute **Source Serif 4** and **Inter** (variable, so the 430/450/480 half-steps survive) unless licences are available.

---

## 11. References

- Problem statement source — [sih.gov.in/sih2026PS](https://sih.gov.in/sih2026PS) (SIH26125, Bharat Electronics Limited)
- [W3C Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C Bitstring Status List v1.0](https://www.w3.org/TR/vc-bitstring-status-list/) — credential revocation
- [Veramo](https://veramo.io) — TypeScript framework for DIDs and verifiable credentials
- [ERC-3643 (T-REX)](https://www.erc3643.org) — permissioned tokens gated by on-chain identity
- ERC-4337 account abstraction — for guardian-based key recovery
- OpenZeppelin Contracts v5 — ERC-721 and AccessControl (note the `_update` hook)
- Hyperledger Besu documentation — private networks and QBFT consensus
- MeitY, Vishvasya Blockchain Technology Stack — PIB press release PRID 2051934
- *A Self-Sovereign Identity Blockchain Framework for Access Control and Transparency in Financial Institutions*, Cryptography, 2025
- *Self-sovereign and blockchain-based access control supporting attribute privacy with zero knowledge*, JNCA, 2022
- Digital Personal Data Protection Act, 2023 (India) — governs what may be written on chain
