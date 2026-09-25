# PRODUCT.md

Strategic context for design work. The full engineering reference is
[`PROJECT.md`](../PROJECT.md); this file only records what design decisions need.

## Register

**Brand** for `/` (the landing page) — design is the product there; it is the
first impression a judge or a BEL evaluator forms.
**Product** for everything behind `/login` — the console, gate check and audit
replay are operated, not read.

## What this is

**CredLock** — a credential-gated asset custody platform for Bharat Electronics Limited, built
for Smart India Hackathon 2026 (problem statement SIH26125). It joins three
things a large organisation normally keeps apart: who a person is, what they may
do, and what they hold custody of.

## Who it is for

| Audience | What they need from the landing page |
|---|---|
| **SIH judges** | To understand the differentiator in fifteen seconds, and remember it after forty other teams |
| **BEL / MoD evaluators** | Credibility. This must look like something a defence PSU could procure, not a hackathon toy |
| **The team** | A page they can put on screen mid-pitch without narrating it |

## The one idea the page must land

> The asset itself refuses to move unless the receiver holds a valid role
> credential.

Set as *asset*, not *token*, on the page itself. It is the same claim — the
asset is the ERC-721 token — but "token" is the vocabulary this file's own
anti-references warn costs credibility with a procurement reader, and
"asset" is the word BEL already uses for the thing being controlled.

Identity platforms stop at issuing a credential. Token standards stop at the
transfer. This makes the transfer *conditional on* the credential — and the
check lives in the contract, so no interface can wave it through.

Everything else on the page is supporting evidence for that sentence.

## Brand personality

Three words, chosen as physical objects rather than adjectives:

**Institutional · Exact · Unhurried** — the register of a well-set technical
standard or a museum caption. Authority that does not raise its voice.

## Tone: confident, not loud

Decided deliberately. The page keeps Steep's restraint, and spends all of its
boldness in exactly one place: a working demonstration of a transfer being
refused. Sober enough for a procurement conversation, unmissable enough to be
remembered.

## Anti-references

- **Web3 / crypto marketing.** No gradients, no neon, no glow, no "revolutionary".
  This is defence procurement; that vocabulary actively costs credibility.
- **Generic govtech.** Navy-blue header, stock photo of people at monitors, a
  seal. Credible but forgettable.
- **The AI landing page.** Uppercase tracked eyebrow above every section,
  `01/02/03` markers as scaffolding, a grid of identical icon-heading-body cards,
  and no imagery at all. The previous version of this page had three of the four.

## Design principles

1. **Show the mechanism, don't assert it.** The differentiator is visual — a
   transfer that fails. Animate the real thing rather than describing it.
2. **Imagery here is the system itself.** Stock photography of soldiers or server
   racks would read as costume. The credible images are the gate, the chain of
   custody, and the printed ID card — artefacts this system actually produces.
3. **Restraint is the ground, not the point.** Monochrome everywhere so that the
   single peach accent means something when it appears.
4. **Never claim more than the code does.** Copy states what is enforced on
   chain, and does not imply anything the demo cannot show.

## Visual system

Steep — already committed and shipping across every surface. See
[`docs/DESIGN.md`](./DESIGN.md) for tokens, type scale and components.

Signifier (substituted by Source Serif 4) for display at weight 400 only, Sohne
(substituted by Inter) for everything else, near-monochrome with a single warm
peach accent on a paper-white ground.
