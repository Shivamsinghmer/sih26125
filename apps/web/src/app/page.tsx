import Link from "next/link";

import { getSession } from "@/lib/auth-actions";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth-types";

export const dynamic = "force-dynamic";

const DELIVERABLES = [
  {
    title: "Decentralised identifiers",
    body: "Every person holds a DID that verifies without a central directory vouching for it. No name, photo or employee number ever reaches the chain.",
  },
  {
    title: "Assets as tokens",
    body: "Each controlled item becomes a non-duplicable token bound to a holder's DID, carrying its own custody history rather than a row in a spreadsheet.",
  },
  {
    title: "Rules enforced in code",
    body: "Only an account holding the issuer role can mint or assign. The contract enforces it, so no interface can wave it through.",
  },
  {
    title: "Roles that actually gate",
    body: "Admin, Manager, Auditor, User. A transfer to someone without a valid credential does not fail politely in the UI — it reverts on chain.",
  },
  {
    title: "An audit trail that cannot disagree",
    body: "The record is not a log about the transactions. It is the transactions, replayable from chain events with no database consulted.",
  },
];

export default async function LandingPage() {
  const session = await getSession();

  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-32 pt-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-caption leading-caption">
          <span className="text-ink-black">BEL Asset Custody</span>
          <span className="text-ash-gray"> · SIH26125</span>
        </p>
        {session ? (
          <Link
            href={ROLE_HOME[session.role]}
            className="rounded-full bg-ink-black px-5 py-2.5 text-caption leading-caption text-paper-white hover:opacity-90"
          >
            Continue as {ROLE_LABEL[session.role]} →
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-ink-black px-5 py-2.5 text-caption leading-caption text-paper-white hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </header>

      <h1 className="display-serif mt-20 max-w-[18ch] text-heading-lg leading-heading-lg tracking-heading-lg">
        Ownership, permission and history become one cryptographic object.
      </h1>

      <p className="mt-8 max-w-[64ch] text-body-lg leading-body-lg text-slate-gray">
        A large organisation cannot prove three things at once — who a person is,
        what they may do, and what they hold custody of — nor prove the record
        was not quietly edited by the administrator who manages it. This is a
        platform for Bharat Electronics Limited that makes all three one record,
        on a private permissioned chain that no single department controls.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-full bg-ink-black px-6 py-3 text-body text-paper-white hover:opacity-90"
        >
          {session ? "Switch account" : "Sign in to the console"}
        </Link>
        <a
          href="#how"
          className="rounded-full border border-ink-black px-6 py-3 text-body text-ink-black hover:bg-mist-gray"
        >
          How it works
        </a>
      </div>

      {/* The differentiator, stated plainly rather than buried in a feature list. */}
      <section className="mt-24 rounded-3xl bg-blush-peach px-8 py-10 text-sienna-brown md:px-12">
        <p className="text-caption leading-caption opacity-70">The difference</p>
        <h2 className="display-serif mt-3 max-w-[24ch] text-heading leading-heading tracking-heading">
          The token refuses to move without a valid credential.
        </h2>
        <p className="mt-5 max-w-[62ch] text-body-lg leading-body-lg opacity-90">
          Identity platforms stop at issuing a credential. Token standards stop at
          the transfer. Here the transfer is conditional on the credential: every
          movement calls into the role registry and reverts if the receiver's
          credential is missing, expired or revoked — from any client, not just
          this one.
        </p>
      </section>

      <section id="how" className="mt-24">
        <p className="text-caption leading-caption text-ash-gray">What it does</p>
        <h2 className="display-serif mt-2 text-heading leading-heading tracking-heading">
          Five deliverables, in the order the demo hits them
        </h2>

        <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {DELIVERABLES.map((item, index) => (
            <li key={item.title} className="border-t border-mist-gray pt-5">
              <p className="mono-addr text-smoke-gray">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-subheading leading-subheading">{item.title}</h3>
              <p className="mt-2 max-w-[46ch] text-body leading-body text-slate-gray">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24">
        <p className="text-caption leading-caption text-ash-gray">Who signs in</p>
        <h2 className="display-serif mt-2 text-heading leading-heading tracking-heading">
          Two very different jobs, two different surfaces
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-mist-gray px-7 py-7">
            <h3 className="text-subheading leading-subheading">Issuing authority</h3>
            <p className="mt-2 text-body leading-body text-slate-gray">
              IT Security and Internal Audit. Onboards people, issues and revokes
              credentials, mints assets, and replays the full history.
            </p>
          </div>
          <div className="rounded-3xl bg-mist-gray px-7 py-7">
            <h3 className="text-subheading leading-subheading">Gate security</h3>
            <p className="mt-2 text-body leading-body text-slate-gray">
              Scans the DID on a printed card and gets one answer: is this
              credential valid right now, and does this person hold the asset
              they are carrying out. Read-only, nothing else exposed.
            </p>
          </div>
        </div>

        <p className="mt-8 max-w-[68ch] text-body leading-body text-slate-gray">
          Signing in decides which screens open. It never decides what the chain
          permits — a compromised session still cannot move an asset to someone
          without a valid credential, because that check lives in the contract.
        </p>
      </section>

      <footer className="mt-24 border-t border-mist-gray pt-6 text-caption leading-caption text-smoke-gray">
        Smart India Hackathon 2026 · Problem statement SIH26125 · Bharat
        Electronics Limited, Ministry of Defence
      </footer>
    </main>
  );
}
