import Link from "next/link";

import { FeatureShowcase } from "@/components/FeatureShowcase";
import { GateScanner } from "@/components/GateScanner";
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
    <div className="landing-shell">
      {/* hero-financial's background, carried over as the block builds it: a
          pale base, the sky photograph at half opacity, two blurred gradient
          bars in the top-left corner, and a blue wash over the first 600px.
          The photograph is vendored into /public rather than hotlinked from
          Unsplash — this demo is expected to run on a closed network, and a
          hero that needs a CDN would come up bare there. */}
      <div className="landing__sky" aria-hidden="true">
        <div className="landing__sky-photo" />

        <svg
          className="landing__sky-blobs"
          width="358"
          height="483"
          viewBox="0 0 358 483"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#skyBlurA)">
            <rect
              x="-86.9961"
              y="-33.114"
              width="72"
              height="541"
              rx="36"
              transform="rotate(-30.8182 -86.9961 -33.114)"
              fill="url(#skyFillA)"
            />
          </g>
          <g filter="url(#skyBlurB)">
            <rect
              x="-17"
              y="-135.113"
              width="50.0937"
              height="541"
              rx="25.0469"
              transform="rotate(-30.8182 -17 -135.113)"
              fill="url(#skyFillB)"
            />
          </g>
          <defs>
            <filter
              id="skyBlurA"
              x="-137.641"
              y="-120.646"
              width="440.285"
              height="602.787"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur stdDeviation="32" result="effect1_foregroundBlur" />
            </filter>
            <filter
              id="skyBlurB"
              x="-71.707"
              y="-215.486"
              width="429.598"
              height="599.69"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur stdDeviation="32" result="effect1_foregroundBlur" />
            </filter>
            <linearGradient
              id="skyFillA"
              x1="-50.9961"
              y1="-33.114"
              x2="-50.9961"
              y2="507.886"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#91bbfb" />
              <stop offset="1" stopColor="#E6F1FF" />
            </linearGradient>
            <linearGradient
              id="skyFillB"
              x1="8.04686"
              y1="-135.113"
              x2="8.04686"
              y2="405.887"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#8dbafd" />
              <stop offset="1" stopColor="#c1d9f8" />
            </linearGradient>
          </defs>
        </svg>

        <div className="landing__sky-wash" />
        <div className="landing__sky-veil" />
      </div>

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
        {/* Composition and background both follow the hero-financial block:
            its sky band above, then a badge, a large centred headline, one
            subhead, paired actions, and the product seated in a frame beneath.
            Type and controls stay Steep, so the page still reads as this
            system wearing the block's sky rather than as a second design. */}
        <section className="landing__hero">
          <p className="landing__badge">
            <span className="landing__badge-mark">SIH26125</span>
            Bharat Electronics Limited · Ministry of Defence
          </p>

          <h1 className="display-serif landing__headline">
            The asset refuses to move without a valid credential.
          </h1>

          <p className="landing__deck">
            Identity, access control and custody of controlled equipment, held
            as one record on a private permissioned chain — where the transfer
            itself reverts if the receiver&rsquo;s credential is missing,
            expired or revoked. Not a greyed-out button. A revert inside the
            contract that every transfer is forced through.
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
            <li>Tamper-evident audit replay</li>
            <li>Verifies offline</li>
          </ul>
        </section>

        <section className="landing__stage" aria-label="The gate reader in use">
          <GateScanner />
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
        /* ------------------------------------------------------------- sky */
        /* The band is full-viewport-width from inside a 1180px container, so it
           is pulled out with left:50% + 100vw. overflow-x: clip on the root
           absorbs the resulting overflow without turning the page into a scroll
           container the way hidden would. */
        .landing-shell {
          position: relative;
          isolation: isolate;
        }

        /* Spans the shell, which is already full body width. An earlier version
           used left:50% + 100vw from inside the 1180px container and clipped it
           on that same element — which is the container, so the bleed was cut
           back to 1180px and left white margins at both edges. */
        .landing__sky {
          position: absolute;
          z-index: -1;
          top: 0;
          left: 0;
          right: 0;
          /* Approximate by design: the band dissolves before it ends, so its
             exact stopping point never shows. */
          height: clamp(820px, 108vh, 1320px);
          overflow: hidden;
          pointer-events: none;
          background: #f7f9fc;
          -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
        }

        .landing__sky-photo {
          position: absolute;
          inset: 0;
          background: url("/hero-sky.jpg") center / cover no-repeat;
          opacity: 0.85;
        }

        .landing__sky-blobs { position: absolute; top: 0; left: 0; }

        .landing__sky-wash {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 600px;
          /* The block's wash is opaque at its top stop, which erased the clouds
             in exactly the band where they read best. Same hues, carried as
             alpha so the photograph stays visible through it. */
          background: linear-gradient(
            to bottom,
            rgba(239, 246, 255, 0.82),
            rgba(219, 234, 254, 0.4),
            transparent
          );
        }

        /* A legibility scrim, not a decoration. Over the strongest part of the
           photograph, Steep's secondary greys measure 2.7:1 — the sky has to
           stay a sky at the edges while the centre column stays readable. */
        .landing__sky-veil {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 68% 54% at 50% 40%,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.72) 46%,
            rgba(255, 255, 255, 0) 78%
          );
        }

        /* ------------------------------------------------------------ bar */
        /* Steep's muted greys are chosen against white. Over the sky they fall
           to roughly 3.5:1, so within the band the ramp is re-pointed darker —
           measured against the photograph's darkest pixel, not guessed. */
        .landing__bar,
        .landing__hero {
          --mkt-muted: #414755;
          --mkt-faint: #424858;
        }

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
        /* Centred, single column. The block's own composition. */
        .landing__hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: clamp(30px, 6vw, 76px) 0 clamp(34px, 5vw, 56px);
        }

        /* The block puts an uppercase tracked "NEW" pill here. That exact
           treatment is on this project's anti-reference list, so the pill keeps
           its position and loses the shouting: sentence case, no tracking, and
           it carries the one fact this audience checks first. */
        .landing__badge {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 0;
          padding: 6px 16px 6px 6px;
          border: 1px solid #fff;
          border-radius: 999px;
          /* A bare outline vanished against the photograph; the block floats
             this pill on white, and over a sky it needs to. */
          background: #fff;
          box-shadow: 0 2px 10px rgba(23, 25, 28, 0.06);
          font-size: 13.5px;
          color: var(--mkt-muted);
        }
        .landing__badge-mark {
          padding: 3px 10px;
          border-radius: 999px;
          background: var(--mkt-ink);
          color: #fff;
          font-size: 12px;
        }

        /* Centred and full-bleed, so it takes the block's larger scale without
           the four ragged lines a narrow column forced. Held at 82px: the
           impeccable ceiling is 96px, and above that a page is shouting. */
        .landing__headline {
          margin: 26px 0 0;
          max-width: 19ch;
          font-size: clamp(38px, 6.4vw, 82px);
          line-height: 1.04;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .landing__deck {
          margin: 24px 0 0;
          max-width: 58ch;
          font-size: clamp(17px, 1.5vw, 20px);
          line-height: 1.5;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }

        .landing__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 32px;
        }

        /* No separators. Four facts fit one line on a wide viewport and wrap to
           two on a phone; a dot-separated list puts a leading dot at the start
           of the wrapped line, which reads as a typo. */
        .landing__spec {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px clamp(20px, 3vw, 40px);
          margin: 34px 0 0;
          padding: 0;
          list-style: none;
          font-size: 13.5px;
          color: var(--mkt-faint);
        }

        /* --------------------------------------------------------- the stage */
        .landing__stage { margin-top: clamp(8px, 2vw, 20px); }

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
    </div>
  );
}
