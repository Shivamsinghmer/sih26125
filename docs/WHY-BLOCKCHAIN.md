# Why a chain and not a database

The hardest question this project can be asked, answered rigorously enough to
survive a judge who already knows the answer they expect.

> **"If I delete the blockchain from your architecture, what requirement of
> SIH26125 becomes impossible to satisfy?"**

This document exists because the honest answer is *conditional*, and a
conditional answer only sounds strong if it is stated deliberately. Improvised,
it sounds like a retreat.

---

## 1. The answer, in one paragraph

Nothing becomes impossible **if one authority is trusted to own the canonical
custody record.** What becomes impossible is a custody record that is
simultaneously canonical for parties that do not report to one another, without
one of them being the system of record and the others holding copies. If BEL's
deployment has a single trusted owner of that record, a replicated PostgreSQL
with signed, append-only audit storage is the correct architecture, it is
simpler, and we would recommend it. The permissioned chain earns its place at
exactly one boundary: where custody of a controlled item is jointly
administered by a contractor and by authorities entitled to inspect it who are
outside the contractor's chain of command.

**Say this before the judge says it for you.** Conceding the case where
blockchain is not justified is what makes the case where it is justified
credible.

---

## 2. Concede everything that is actually true

A competently built centralised system provides all of this, and claiming
otherwise loses the room:

| Property | Conventional answer |
|---|---|
| Immutability | WORM storage, S3 Object Lock, append-only table with revoked `DELETE`/`UPDATE` |
| Tamper evidence | Merkle hash chain over the log, periodically signed |
| Non-repudiation of an action | The actor signs the request with a hardware-backed key |
| Role separation | RBAC, separate duties, four-eyes approval |
| Independent audit | A replica the audited party cannot write to |
| Availability | Streaming replication across four sites |
| Transparency | Read access for the auditor |

So none of *immutability*, *security*, *transparency*, *decentralisation* or
*tamper-proof records* is an acceptable answer on its own. Each one has a
cheaper conventional implementation, and a judge who has built systems knows it.

**The authorisation function is not the argument either.** `if
receiver.clearance >= asset.requiredClearance` is a trivial predicate and it
runs perfectly well in a backend service. "The asset itself refuses to move" is
a description of *where* the predicate is evaluated and *what else is true at
the moment it is evaluated* — it is not a claim that the predicate is novel.

---

## 3. The one property a signed log does not have

A hash-chained, signed, append-only log proves that the history **you were
shown** has not been altered since it was signed. It does not prove it is the
same history **anybody else was shown**.

One party holding the writing key can maintain two internally consistent,
correctly signed histories and serve one to the contractor and the other to the
inspecting authority. Every signature verifies in both. Every hash links in
both. Nothing inside either log reveals the other. This is the split-view, or
fork, attack, and it is the reason transparency logs need gossip between
readers rather than signatures alone.

Detecting it requires the readers to exchange checkpoints out of band and
compare. The moment that comparison is made mandatory, ordered, and binding on
what counts as canonical, **you have built a consensus protocol** — you have
just built it yourself, in application code, without the proof obligations
anybody has checked.

QBFT removes the possibility rather than providing a way to notice it
afterwards. A validator that signs two different blocks at the same height
emits a transferable cryptographic proof of its own misbehaviour, and with
agreement from more than two-thirds of the validator set, no two honest readers
can ever hold conflicting canonical state.

**Why that matters for custody specifically.** Custody decisions are taken at
the moment of a transfer and at the gate, by different parties, in different
buildings, sometimes at the same moment. *"Who holds SN-8823 right now"* must
have one answer, and it must be the same answer for the contractor moving the
item and for the authority entitled to inspect it. A discrepancy found at the
next physical verification is found after the item has already moved. Detection
is not the requirement; **non-divergence is.**

Two smaller properties follow from the same place and are worth having ready:

- **Liveness of the record against a non-cooperating custodian.** The owner of
  a central system of record can stop answering. Two-thirds of a validator set
  proceeds without the party that refuses. An auditor who can read the canonical
  record *without the audited party's cooperation* has something a replica does
  not give them, because a replica's master decides what to replicate.
- **No reconciliation master.** Replication has an authoritative copy; when
  copies disagree the answer to "which is right" names an owner. Consensus has
  no master to reconcile to, so that question has an answer that does not name
  one.

And the one already in `PROJECT.md`, which is real but not decisive: the
authorisation decision and its audit entry are **one write, not two**. In a
conventional design they are separate writes to separate systems, and every
pair of writes is a place where the record and the event can diverge — the log
fails, or is written while the transaction rolls back, or is written differently.

---

## 4. The correction this document forces

`docs/PRODUCTION.md` has, until now, named the four validators as **IT
Security, Internal Audit, and two operating divisions**. That is a weaker
version of the argument and a judge will say so in one sentence: *"Who owns the
servers? BEL. Then BEL can equivocate exactly as freely as it could with one
database."* They would be right. Four nodes inside one organisation is
distributed infrastructure, not distributed trust.

**The trust boundary that is real in this domain is between organisations, not
between departments.** A licensed defence industry's custody record is already
inter-organisational:

| Validator | Why it is genuinely separate |
|---|---|
| The contractor (BEL) | Holds and moves the item |
| The licensing authority (DDP) | Licenses the facility and sets the security manual the clearances come from; does not report to the contractor |
| Resident quality-assurance / inspection authority | Sits inside contractor premises, reports to the customer |
| The receiving Service unit or depot | Takes custody at the far end of the transfer |

That set has the property the argument needs: no participant can rewrite
history without collusion across an organisational boundary, and the party with
the strongest motive to revise a custody record is not the party that can.

> Confirm the exact counterpart names and their appetite for running a node
> before stating them on stage. The *shape* of the claim is what matters; the
> named bodies are the illustration.

If the deployment BEL actually wants is single-organisation, **say so and
recommend Postgres.** That answer scores better than defending a design the
customer does not need.

---

## 5. What the chain does not do

State these before they are extracted from you. Each one is a boundary, not a
hole, and naming the boundary is what makes the rest believable.

- **It records provenance, not truth.** A corrupt issuer with `ISSUER_ROLE` can
  grant a fraudulent clearance and the contract will faithfully honour it.
  Garbage in, garbage faithfully preserved. What changes is narrower and still
  worth having: the grant is signed, attributable to a named key, visible in
  real time to a party outside the issuer's chain of command, and cannot be
  retroactively erased once the item has moved on it. It converts an
  undetectable insider action into an attributable one. It does not prevent it.
- **The root of trust is organisational, not cryptographic.** Nothing here
  decides that a person *deserves* Secret. Vetting does. The chain enforces and
  records a decision taken elsewhere. Separating `ISSUER_ROLE`, `REVOKER_ROLE`
  and `AUDITOR_ROLE` narrows who can take it; it does not relocate it.
- **Key theft is moved, not solved.** A stolen key acts as its holder.
  `GuardianRecovery` is a real answer to *loss* and a partial answer to *theft*,
  and it is a consequence of self-custody, not of the ledger — the same quorum
  logic can be built in an enterprise IAM. Do not offer it as a blockchain
  benefit.
- **The prototype's key custody is centralised.** In the demo the server derives
  every key from an HD mnemonic and can sign as anyone; `PRODUCTION.md` records
  what production does instead. Say this plainly if asked, because it is true
  and it is already written down. "The ledger and the enforcement are
  distributed; the demo simplifies user key custody, which is the first item on
  the hardening list."
- **Offline means offline *verification*, not offline operation.** The compiled
  verifier validates an exported custody bundle with the cable pulled. The gate
  is a live read and **fails closed** — it tells the guard the record cannot be
  reached and to call the issuing authority, which is the correct behaviour and
  not the same claim. Never say "our system works offline."

---

## 6. What is actually novel

None of the primitives are ours, and the slide says so: DIDs, Verifiable
Credentials, SD-JWT, ERC-721, QBFT are all published standards. Claiming
invention here is the fastest way to lose the innovation score.

The defensible claim is about composition and about where the check sits:

> **Credential state and custody state live in one consensus domain, so an
> authorisation decision cannot be taken against a version of the clearance
> register that another party disputes — and the decision and its record are
> the same write.**

In a conventional deployment the clearance store, the asset register and the
audit log are three systems owned by two or three teams. Keeping them
consistent is an integration problem, and the problem statement's own list of
failures — identity in AD, permissions with an administrator, assets in SAP,
custody on paper, audit in a trigger — *is* a list of integration seams. Our
claim is that for jointly administered custody, collapsing those seams into one
replicated state machine is the smaller system, not the larger one.

Note honestly that this composition could also be built without a chain, given
a single trusted owner. That is the same conditional as §1, and it is fine.

---

## 7. Language to change

| Do not say | Say |
|---|---|
| "Every asset is an NFT" | "Each asset is a uniquely identifiable ERC-721 ownership record" — NFT carries collectibles baggage into a procurement conversation |
| "We replace the asset register / SAP" | "We sit above the existing ERP and HR systems as an authorisation and custody layer" — nobody is going to discard SAP |
| "Our system works offline" | "We can verify a custody record offline; the gate fails closed when the record is unreachable" |
| "Fully decentralised custody" | "Permissioned and multi-party; demo key custody is simplified and identified as hardening" |
| "Blockchain makes it tamper-proof" | "Consensus makes it impossible for two authorities to be shown different answers" |

---

## 8. Prepared exchanges

**"What does blockchain add that PostgreSQL and RBAC cannot?"**
> For the authorisation check, nothing — that predicate runs fine in a backend
> service, and we say so. What it adds is that no single party owns the
> canonical custody record. A signed append-only log proves the history you
> were shown was not edited; it does not prove it is the history the auditor was
> shown. One writer can maintain two correctly signed histories and serve one to
> each. Preventing that, rather than noticing it at the next audit, is consensus
> — and if you build the checkpoint comparison yourself you have written a
> consensus protocol with no proofs. That is the requirement. If BEL's
> governance model has one trusted owner of the record, we would recommend
> Postgres instead.

**"If BEL owns all four validators, haven't you rebuilt a centralised system?"**
> Yes, and that is why we do not propose that. Four nodes inside one
> organisation is distributed infrastructure, not distributed trust. The
> boundary we build for is the one that already exists in a licensed defence
> industry: the contractor, the licensing authority, the resident inspection
> authority and the receiving unit. If the deployment is genuinely
> single-organisation, the honest recommendation is a database.

**"Isn't the smart contract just a fancy authorisation function?"**
> The function is four lines and we would not claim it as innovation. What is
> not ordinary is that the clearance register it reads and the custody state it
> writes are under the same consensus, in the same transaction, so the decision
> cannot be taken against a disputed version of the register and the record of
> the decision cannot diverge from the decision.

**"If an authorised issuer grants a fraudulent clearance, what stops it?"**
> Nothing, by itself — and any system that claims otherwise is overclaiming.
> The chain records provenance, not truth. What it changes is that the grant is
> signed, attributed to a named key, visible immediately to a party outside the
> issuer's chain of command, and cannot be erased afterwards. We separate
> issuance, revocation and inspection authority so that fraud requires more than
> one post. It narrows the problem; it does not close it.

**"Why an NFT for a physical instrument?"**
> We use the ERC-721 ownership primitive because the asset is uniquely
> identifiable and custody is exclusive — one holder at a time, with a complete
> transfer history. We are not making a collectible, and we would not use the
> word NFT in a specification.

**"Why should BEL accept this operational complexity?"**
> Only for jointly administered custody. For a single-authority asset register
> it is not worth it and we would not propose it. Where an external authority
> must be able to read and rely on the same custody record without the audited
> party's cooperation, the alternative is not "one database" — it is a database
> plus a reconciliation process plus a dispute procedure, and that is the
> complexity we are replacing.

**"What is genuinely yours?"**
> The composition, not the primitives. Coupling credential validity directly to
> whether custody can change, in one consensus domain, with the record and the
> event as a single write.

---

## 9. The repositioning, in one line

Not *"we use blockchain to solve secure asset management"* — which invites the
whole attack — but:

> **We solve credential-bound asset custody. The permissioned chain is the
> trust layer for the case where custody is jointly administered by authorities
> that do not report to one another.**

Function first, architecture second, and the architecture stated as a
conditional that we are willing to lose.
