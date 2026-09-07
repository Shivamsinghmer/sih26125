import Link from "next/link";

import { FeatureShowcase } from "@/components/FeatureShowcase";
import { GateDemonstration } from "@/components/GateDemonstration";
import { getSession } from "@/lib/auth-actions";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth-types";

export const dynamic = "force-dynamic";

/**
 * The landing page.
 *
 * Its whole job is one sentence — the token refuses to move without a valid
 * credential — and the fastest way to land it is to show a transfer failing
 * rather than to describe one. Everything below the fold is evidence for that
 * claim, in descending order of how much a sceptical evaluator needs it.
 *
 * Deliberately absent: an uppercase kicker above every section, 01/02/03
 * markers used as scaffolding, and a grid of identical cards. Those read as
 * template regardless of how good the copy is.
 */

/** The five things BEL asked for, in the order the live demo hits them. */
const DEMO_STEPS = [
  {
    step: "Issue",
    title: "An identity nobody has to vouch for",
    body: "A DID is created for a person and a role credential issued against it. The chain carries the identifier, a public key and a status flag — never a name, a photo or an employee number.",
  },
  {
    step: "Register",
    title: "The asset becomes the record",
    body: "A controlled item is minted as a token bound to its holder's DID, carrying its own custody history instead of appearing as a row in somebody's spreadsheet.",
  },
  {
    step: "Refuse",
    title: "The transfer that cannot happen",
    body: "Moving the asset to someone without a valid credential reverts inside the contract. Not a disabled button, not a validation message — the transaction fails, and it fails the same way from a script.",
    emphasis: true,
  },
  {
    step: "Revoke",
    title: "Offboarding in one transaction",
    body: "Withdrawing a credential is a single on-chain write. Every verifier sees it on its next check, including the ones that were offline when it happened.",
  },
  {
    step: "Replay",
    title: "A record that cannot disagree with itself",
    body: "The audit trail is not a log about the transactions. It is the transactions, reconstructed from chain events with no database consulted — so there is no second version to reconcile.",
  },
];

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="landing">
      <header className="landing__bar">
        <p className="landing__mark">
          <span>BEL Asset Custody</span>
          <span className="landing__mark-sub">SIH26125</span>
        </p>
        <Link href={session ? ROLE_HOME[session.role] : "/login"} className="landing__cta">
          {session ? `Continue as ${ROLE_LABEL[session.role]}` : "Sign in"}
        </Link>
      </header>

      <main>
        {/* The hero is the demonstration. The headline introduces it; it does
            not carry the fold alone. */}
        <section className="landing__hero">
          <div className="landing__hero-copy">
            <h1 className="display-serif landing__headline">
              The token refuses to move without a valid credential.
            </h1>
            <p className="landing__standfirst">
              A large organisation cannot prove three things at once — who a person
              is, what they may do, and what they hold custody of — nor prove the
              record was not quietly edited by the administrator who keeps it.
              This makes all three a single record on a private permissioned
              chain that no one department controls.
            </p>
            <div className="landing__actions">
              <Link href="/login" className="landing__cta landing__cta--lg">
                {session ? "Switch account" : "Sign in to the console"}
              </Link>
              <a href="#mechanism" className="landing__ghost">
                How the refusal works
              </a>
            </div>
          </div>

          <div className="landing__hero-demo">
            <GateDemonstration />
          </div>
        </section>

        {/* The claim, stated once, where it can be checked. */}
        <section id="mechanism" className="landing__mechanism">
          <h2 className="display-serif landing__h2">
            Identity platforms stop at the credential. Token standards stop at the
            transfer.
          </h2>
          <div className="landing__mechanism-body">
            <p className="landing__prose">
              This joins them. Every movement of an asset calls into the role
              registry and reverts if the receiver&rsquo;s credential is missing,
              expired or revoked — a check that lives in{" "}
              <code>AssetToken._update</code>, the hook every ERC-721 transfer is
              forced through.
            </p>
            <p className="landing__prose landing__prose--muted">
              Because it sits there rather than in an interface, it holds for this
              console, for a script, and for any client anyone writes later. That
              is the difference between a permission and a rule.
            </p>
          </div>
        </section>

        {/* The five deliverables, as the demo sequence they genuinely are —
            the order carries information, so the numbering earns its place. */}
        <section className="landing__steps">
          <h2 className="display-serif landing__h2">Five minutes, in five moves</h2>
          <ol className="landing__step-list">
            {DEMO_STEPS.map((item, index) => (
              <li
                key={item.step}
                className={`landing__step${item.emphasis ? " landing__step--emphasis" : ""}`}
              >
                <p className="landing__step-index">
                  <span className="tabular">{index + 1}</span>
                  <span className="landing__step-name">{item.step}</span>
                </p>
                <div>
                  <h3 className="landing__step-title">{item.title}</h3>
                  <p className="landing__step-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <FeatureShowcase />

        {/* Two surfaces, deliberately unequal — the console is most of the
            system, the gate is one question asked well. */}
        <section className="landing__surfaces">
          <h2 className="display-serif landing__h2">Two jobs that share nothing</h2>

          <div className="landing__surface-grid">
            <article className="landing__surface">
              <h3 className="landing__surface-title">The issuing authority</h3>
              <p className="landing__prose">
                IT Security and Internal Audit onboard people, issue and revoke
                credentials, register assets and replay the entire history. Their
                console role is read from the chain, so revoking someone&rsquo;s
                credential closes their console with it — there is no second place
                to remember.
              </p>
            </article>

            <article className="landing__surface landing__surface--narrow">
              <h3 className="landing__surface-title">The gate</h3>
              <p className="landing__prose">
                A guard scans the DID on a printed card and gets one answer: is
                this credential valid right now. Read-only, and provisioned as a
                device rather than a person — a gate post is staffed by whoever is
                on shift.
              </p>
            </article>
          </div>

          <p className="landing__note">
            Signing in decides which screens open. It never decides what the chain
            permits: a compromised session still cannot move an asset to someone
            without a valid credential, because that check is not in the session.
          </p>
        </section>
        {/* The project's committed pitch sentence, given the last word. The
            hero states the mechanism; this states what it amounts to. */}
        <section className="landing__close">
          <p className="display-serif landing__close-line">
            Ownership, permission and history become one cryptographic object
            that no administrator can rewrite.
          </p>
        </section>
      </main>

      <footer className="landing__foot">
        <p>
          Smart India Hackathon 2026 · Problem statement SIH26125
        </p>
        <p className="landing__foot-org">
          Bharat Electronics Limited · Ministry of Defence
        </p>
      </footer>

      <style>{`
        .landing {
          --gutter: clamp(20px, 5vw, 64px);

          /*
           * Steep's slate/ash/smoke are defined for links, tertiary labels and
           * placeholders. At 14-18px on white they measure 4.23:1, 2.92:1 and
           * 2.43:1 — below the 4.5:1 that running text needs. These are the
           * same cool-gray family stepped dark enough to pass, used only where
           * text is actually read rather than skimmed.
           */
          --read-muted: #616675;   /* 5.73:1 — standfirst, prose, step bodies */
          --read-faint: #6f7482;   /* 4.67:1 — metadata, footer, step index */
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 var(--gutter) 96px;
        }

        /* ------------------------------------------------------------ bar */
        .landing__bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 26px 0;
        }
        .landing__mark {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin: 0;
          font-size: 15px;
          color: var(--color-ink-black, #17191c);
        }
        .landing__mark-sub { color: var(--read-faint); }

        .landing__cta {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: var(--color-ink-black, #17191c);
          color: var(--color-paper-white, #fff);
          padding: 10px 20px;
          font-size: 15px;
          transition: opacity 160ms ease-out;
        }
        .landing__cta:hover { opacity: 0.88; }
        .landing__cta--lg { padding: 13px 26px; font-size: 17px; }

        .landing__ghost {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid var(--color-ink-black, #17191c);
          padding: 12px 25px;
          font-size: 17px;
          color: var(--color-ink-black, #17191c);
          transition: background-color 160ms ease-out;
        }
        .landing__ghost:hover { background: var(--color-mist-gray, #f2f2f3); }

        /* ----------------------------------------------------------- hero */
        .landing__hero {
          display: grid;
          gap: clamp(36px, 5vw, 64px);
          padding: clamp(28px, 5vw, 56px) 0 clamp(56px, 8vw, 104px);
          align-items: center;
        }
        @media (min-width: 900px) {
          .landing__hero { grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr); }
        }

        .landing__headline {
          margin: 0;
          font-size: clamp(38px, 5.4vw, 68px);
          line-height: 1.08;
          letter-spacing: -0.028em;
          text-wrap: balance;
          color: var(--color-ink-black, #17191c);
        }
        .landing__standfirst {
          margin: 26px 0 0;
          max-width: 54ch;
          font-size: 18px;
          line-height: 1.55;
          text-wrap: pretty;
          color: var(--read-muted);
        }
        .landing__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 32px;
        }

        /* ------------------------------------------------------ mechanism */
        .landing__mechanism,
        .landing__steps,
        .landing__surfaces {
          padding-top: clamp(56px, 8vw, 104px);
          border-top: 1px solid var(--color-mist-gray, #f2f2f3);
        }

        .landing__h2 {
          margin: 0;
          max-width: 24ch;
          font-size: clamp(27px, 3.2vw, 42px);
          line-height: 1.2;
          letter-spacing: -0.02em;
          text-wrap: balance;
          color: var(--color-ink-black, #17191c);
        }

        .landing__mechanism-body {
          display: grid;
          gap: 20px;
          margin-top: 28px;
        }
        @media (min-width: 860px) {
          .landing__mechanism-body { grid-template-columns: 1fr 1fr; gap: 40px; }
        }

        .landing__prose {
          margin: 0;
          max-width: 62ch;
          font-size: 17px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--color-ink-black, #17191c);
        }
        .landing__prose--muted { color: var(--read-muted); }
        .landing__prose code,
        .landing__step-body code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.88em;
        }

        /* ---------------------------------------------------------- steps */
        .landing__step-list {
          list-style: none;
          margin: 40px 0 0;
          padding: 0;
        }
        .landing__step {
          display: grid;
          gap: 8px 28px;
          padding: 26px 0;
          border-top: 1px solid var(--color-mist-gray, #f2f2f3);
        }
        .landing__step:first-child { border-top: 0; padding-top: 0; }
        @media (min-width: 760px) {
          .landing__step { grid-template-columns: 168px minmax(0, 1fr); }
        }

        /* The refusal is the argument; it gets the accent and nothing else does. */
        .landing__step--emphasis {
          background: var(--surface-accent-blush, #fbe1d1);
          border-radius: 20px;
          border-top-color: transparent;
          padding: 28px clamp(20px, 3vw, 30px);
          margin: 8px 0;
        }
        .landing__step--emphasis + .landing__step { border-top-color: transparent; }
        .landing__step--emphasis .landing__step-index,
        .landing__step--emphasis .landing__step-title { color: var(--color-sienna-brown, #5d2a1a); }
        .landing__step--emphasis .landing__step-body { color: var(--color-sienna-brown, #5d2a1a); opacity: 0.86; }

        .landing__step-index {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin: 0;
          font-size: 14px;
          color: var(--read-faint);
        }
        .landing__step-name { color: var(--color-ink-black, #17191c); }
        .landing__step--emphasis .landing__step-name { color: var(--color-sienna-brown, #5d2a1a); }

        .landing__step-title {
          margin: 0;
          font-size: 21px;
          line-height: 1.3;
          color: var(--color-ink-black, #17191c);
        }
        .landing__step-body {
          margin: 8px 0 0;
          max-width: 64ch;
          font-size: 16px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--read-muted);
        }

        /* ------------------------------------------------------- surfaces */
        .landing__surface-grid {
          display: grid;
          gap: 28px;
          margin-top: 36px;
        }
        @media (min-width: 860px) {
          .landing__surface-grid { grid-template-columns: 1.35fr 1fr; gap: 56px; }
        }
        .landing__surface-title {
          margin: 0 0 10px;
          font-size: 21px;
          color: var(--color-ink-black, #17191c);
        }
        .landing__note {
          margin: 36px 0 0;
          max-width: 70ch;
          font-size: 15px;
          line-height: 1.6;
          color: var(--read-muted);
        }

        /* ---------------------------------------------------------- close */
        .landing__close {
          margin-top: clamp(56px, 8vw, 104px);
          padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
          border-radius: 24px;
          background: var(--color-ink-black, #17191c);
        }
        .landing__close-line {
          margin: 0;
          max-width: 22ch;
          font-size: clamp(26px, 3.4vw, 44px);
          line-height: 1.22;
          letter-spacing: -0.02em;
          text-wrap: balance;
          color: var(--color-paper-white, #fff);
        }

        /* ----------------------------------------------------------- foot */
        .landing__foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px;
          margin-top: clamp(56px, 8vw, 96px);
          padding-top: 24px;
          border-top: 1px solid var(--color-mist-gray, #f2f2f3);
          font-size: 14px;
          color: var(--read-faint);
        }
        .landing__foot p { margin: 0; }
        .landing__foot-org { color: var(--read-muted); }
      `}</style>
    </div>
  );
}
