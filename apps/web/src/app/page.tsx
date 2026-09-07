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
 * rather than describe one. Everything below is evidence, in descending order
 * of how much a sceptical evaluator needs it.
 *
 * Every section uses the shared `.mkt-*` system in globals.css, so heading
 * size, measure and vertical rhythm are identical by construction. The previous
 * version repeated those values per section and they drifted apart.
 */

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
    <div className="mkt landing">
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
        {/* The hero is the demonstration; the headline introduces it. */}
        <section className="landing__hero">
          <div className="landing__lede">
            <h1 className="display-serif landing__headline">
              The asset refuses to move without a valid credential.
            </h1>
            <p className="landing__deck">
              Not a greyed-out button. A revert inside the contract that every
              transfer is forced through.
            </p>
            <p className="landing__standfirst">
              Who a person is, what they may do, and what they hold custody of are
              normally three systems that can disagree — kept by an administrator
              who can quietly edit all three. This makes them one record on a
              private permissioned chain that no single department controls.
            </p>
            <div className="landing__actions">
              <Link href="/login" className="landing__cta landing__cta--lg">
                {session ? "Switch account" : "Sign in to the console"}
              </Link>
              <a href="#mechanism" className="landing__ghost">
                How the refusal works
              </a>
            </div>

            {/* A colophon, not a stats grid: four facts a procurement reader
                checks for, set at reading size and stated flatly. */}
            <ul className="landing__spec">
              <li>Hyperledger Besu · QBFT</li>
              <li>W3C Verifiable Credentials</li>
              <li>No personal data on chain</li>
              <li>Verifies offline</li>
            </ul>
          </div>

          <div className="landing__demo">
            <GateDemonstration />
          </div>
        </section>

        <section id="mechanism" className="mkt-section">
          <h2 className="mkt-title">
            Identity platforms stop at the credential. Token standards stop at the
            transfer.
          </h2>
          <div className="mkt-content landing__two-col">
            <p className="mkt-body">
              This joins them. Every movement of an asset calls into the role
              registry and reverts if the receiver&rsquo;s credential is missing,
              expired or revoked — a check that lives in{" "}
              <code>AssetToken._update</code>, the hook every ERC-721 transfer is
              forced through.
            </p>
            <p className="mkt-body mkt-body--muted">
              Because it sits there rather than in an interface, it holds for this
              console, for a script, and for any client anyone writes later. That
              is the difference between a permission and a rule.
            </p>
          </div>
        </section>

        {/* A genuine sequence, so the numbering carries information. */}
        <section className="mkt-section">
          <h2 className="mkt-title">Five minutes, in five moves</h2>
          <ol className="mkt-content landing__steps">
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

        <section className="mkt-section">
          <h2 className="mkt-title">Two jobs that share nothing</h2>
          <div className="mkt-content landing__surface-grid">
            <article>
              <h3 className="landing__surface-title">The issuing authority</h3>
              <p className="mkt-body">
                IT Security and Internal Audit onboard people, issue and revoke
                credentials, register assets and replay the entire history. Their
                console role is read from the chain, so revoking someone&rsquo;s
                credential closes their console with it — there is no second place
                to remember.
              </p>
            </article>

            <article>
              <h3 className="landing__surface-title">The gate</h3>
              <p className="mkt-body">
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

        <section className="landing__close">
          <p className="display-serif landing__close-line">
            Ownership, permission and history become one cryptographic object
            that no administrator can rewrite.
          </p>
        </section>
      </main>

      <footer className="landing__foot">
        <p>Smart India Hackathon 2026 · Problem statement SIH26125</p>
        <p className="landing__foot-org">
          Bharat Electronics Limited · Ministry of Defence
        </p>
      </footer>

      <style>{`
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
        }
        .landing__mark-sub { color: var(--mkt-faint); }

        .landing__cta {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: var(--mkt-ink);
          color: #fff;
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
          border: 1px solid var(--mkt-ink);
          padding: 12px 25px;
          font-size: 17px;
          color: var(--mkt-ink);
          transition: background-color 160ms ease-out;
        }
        .landing__ghost:hover { background: #f2f2f3; }

        /* ----------------------------------------------------------- hero */
        .landing__hero {
          display: grid;
          gap: clamp(36px, 5vw, 60px);
          padding: clamp(24px, 4vw, 44px) 0 0;
          align-items: start;
        }
        /* Both columns are allowed to shrink below their content width; the
           default (auto) lets a wide child set a floor for the whole row. */
        .landing__hero > * { min-width: 0; }
        @media (min-width: 900px) {
          .landing__hero { grid-template-columns: minmax(0, 1.04fr) minmax(0, 1fr); }
        }

        /* The ceiling is 54px rather than 66px on purpose. At 66px this
           sentence broke into four short ragged lines inside the hero column,
           which reads as a poster; at 54px it sets in three even ones and the
           whole hero fits above the fold on a laptop. */
        .landing__headline {
          margin: 0;
          max-width: 17ch;
          font-size: clamp(36px, 4.4vw, 54px);
          line-height: 1.1;
          letter-spacing: -0.026em;
          text-wrap: balance;
        }

        /* The mechanism, at the second-largest size on the page. It used to be
           buried in the middle of the standfirst, which is the one claim a
           sceptical reader is actually looking for. */
        .landing__deck {
          margin: 22px 0 0;
          max-width: 46ch;
          font-size: 20px;
          line-height: 1.42;
          text-wrap: pretty;
          color: var(--mkt-ink);
        }
        .landing__standfirst {
          margin: 16px 0 0;
          max-width: 54ch;
          font-size: 16px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }
        .landing__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        /* Set as a grid rather than a dot-separated row. Four facts do not fit
           on one line in this column, and a wrapped separated list puts a
           leading separator at the start of the second line — which looks like
           a typo. A grid needs no separators at all. */
        .landing__spec {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px 24px;
          margin: 30px 0 0;
          padding: 18px 0 0;
          border-top: 1px solid var(--mkt-rule);
          list-style: none;
          font-size: 13.5px;
          line-height: 1.35;
          color: var(--mkt-faint);
        }
        @media (max-width: 420px) {
          .landing__spec { grid-template-columns: 1fr; }
        }

        /* -------------------------------------------------------- content */
        .landing__two-col { display: grid; gap: 20px; }
        @media (min-width: 860px) {
          .landing__two-col { grid-template-columns: 1fr 1fr; gap: 40px; }
        }

        .landing__steps { list-style: none; padding: 0; }
        .landing__step {
          display: grid;
          gap: 8px 28px;
          padding: 26px 0;
          border-top: 1px solid var(--mkt-rule);
        }
        .landing__step:first-child { border-top: 0; padding-top: 0; }
        @media (min-width: 760px) {
          .landing__step { grid-template-columns: 168px minmax(0, 1fr); }
        }

        .landing__step--emphasis {
          background: #fbe1d1;
          border-radius: 20px;
          border-top-color: transparent;
          padding: 28px clamp(20px, 3vw, 30px);
          margin: 8px 0;
        }
        .landing__step--emphasis + .landing__step { border-top-color: transparent; }
        .landing__step--emphasis .landing__step-index,
        .landing__step--emphasis .landing__step-name,
        .landing__step--emphasis .landing__step-title { color: #5d2a1a; }
        .landing__step--emphasis .landing__step-body { color: #5d2a1a; opacity: 0.86; }

        .landing__step-index {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin: 0;
          font-size: 14px;
          color: var(--mkt-faint);
        }
        .landing__step-name { color: var(--mkt-ink); }

        .landing__step-title { margin: 0; font-size: 21px; line-height: 1.3; }
        .landing__step-body {
          margin: 8px 0 0;
          max-width: 64ch;
          font-size: 16px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }

        .landing__surface-grid { display: grid; gap: 28px; }
        @media (min-width: 860px) {
          .landing__surface-grid { grid-template-columns: 1.35fr 1fr; gap: 56px; }
        }
        .landing__surface-title { margin: 0 0 10px; font-size: 21px; }

        .landing__note {
          margin: 36px 0 0;
          max-width: 70ch;
          font-size: 15px;
          line-height: 1.6;
          color: var(--mkt-muted);
        }

        /* ---------------------------------------------------------- close */
        .landing__close {
          margin-top: var(--mkt-rhythm);
          padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
          border-radius: 24px;
          background: var(--mkt-ink);
        }
        .landing__close-line {
          margin: 0;
          max-width: 22ch;
          font-size: clamp(26px, 3.4vw, 44px);
          line-height: 1.22;
          letter-spacing: -0.022em;
          text-wrap: balance;
          color: #fff;
        }

        /* ----------------------------------------------------------- foot */
        .landing__foot {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px;
          margin-top: var(--mkt-rhythm);
          padding-top: 24px;
          border-top: 1px solid var(--mkt-rule);
          font-size: 14px;
          color: var(--mkt-faint);
        }
        .landing__foot p { margin: 0; }
        .landing__foot-org { color: var(--mkt-muted); }
      `}</style>
    </div>
  );
}
