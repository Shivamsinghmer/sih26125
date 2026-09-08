import Link from "next/link";

import { ContractExcerpt } from "@/components/ContractExcerpt";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import { GateScanner } from "@/components/GateScanner";
import { SkyBackdrop } from "@/components/SkyBackdrop";
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

/**
 * The two operated surfaces, set as a specification rather than as prose. Every
 * cell is a claim the shipped app already makes; the shared row is the point of
 * the section.
 */
const SURFACE_SPEC = [
  {
    property: "Provisioned as",
    authority: "A person, whose console role is read from the chain.",
    gate: "A post rather than a person — staffed by whoever is on shift.",
  },
  {
    property: "Can",
    authority:
      "Onboard identities, issue and revoke credentials, register assets, replay the whole history.",
    gate: "Ask one question: is this credential valid right now.",
  },
  {
    property: "Cannot",
    authority:
      "Move an asset to someone without a valid credential. The contract refuses the console like anything else.",
    gate: "Write. It reads, and holds no credential of its own.",
  },
  {
    property: "Loses access when",
    authority:
      "Their own credential is revoked — one write closes the console with it.",
    gate: "The post is stood down. Nothing personal was ever issued to it.",
  },
];

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="landing-shell">
      <SkyBackdrop variant="hero" />

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
            expired or revoked.
          </p>

          <div className="landing__actions">
            <Link href="/login" className="landing__cta landing__cta--lg">
              {session ? "Switch account" : "Sign in to the console"}
            </Link>
            <a href="#mechanism" className="landing__ghost">
              How the refusal works
            </a>
          </div>
        </section>

        <section className="landing__stage" aria-label="The gate reader in use">
          <GateScanner />
        </section>

        {/* The claim and its proof on one row. The page's first principle is
            to show the mechanism rather than assert it, and the mechanism is
            twenty lines of Solidity — so they are on the page. */}
        <section id="mechanism" className="mkt-section landing__mechanism">
          <div className="landing__mech">
            <div className="landing__mech-claim">
              <h2 className="mkt-title">
                Identity platforms stop at the credential. Token standards stop
                at the transfer.
              </h2>
              <p className="mkt-body landing__mech-body">
                This joins them. Every movement of an asset calls into the role
                registry and reverts if the receiver&rsquo;s credential is
                missing, expired or revoked.
              </p>
              <p className="mkt-body mkt-body--muted landing__mech-body">
                Because the check sits in the contract rather than in an
                interface, it holds for this console, for a script, and for any
                client anyone writes later. That is the difference between a
                permission and a rule.
              </p>
            </div>

            <ContractExcerpt />
          </div>
        </section>

        {/* A genuine sequence, so the numbering carries information, and a
            rail so the eye reads it as one. The third move used to sit in a
            peach card, which broke the very grid that made it a sequence — it
            now takes its weight from a filled node and ink body copy instead. */}
        <section className="mkt-section mkt-section--band">
          <h2 className="mkt-title">Five minutes, in five moves</h2>
          <ol className="mkt-content landing__steps">
            {DEMO_STEPS.map((item, index) => (
              <li
                key={item.step}
                className="landing__step"
                data-emphasis={item.emphasis ? "true" : undefined}
              >
                <span className="landing__step-node" aria-hidden="true" />
                <p className="landing__step-index">
                  <span className="tabular">{index + 1}</span>
                  <span className="landing__step-name">{item.step}</span>
                </p>
                <div className="landing__step-main">
                  <h3 className="landing__step-title">{item.title}</h3>
                  <p className="landing__step-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <FeatureShowcase />

        {/* Two paragraphs of prose asked a procurement reader to hold the
            comparison in their head. A specification does the holding: the two
            surfaces line up column by column, and the last row is the only
            thing they have in common. */}
        <section className="mkt-section mkt-section--band landing__jobs">
          <h2 className="mkt-title">Two jobs that share nothing</h2>

          <div className="mkt-content">
            <table className="landing__spec" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader" className="landing__spec-corner">
                    <span className="landing__spec-hidden">Property</span>
                  </th>
                  <th scope="col" role="columnheader">The issuing authority</th>
                  <th scope="col" role="columnheader">The gate</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {SURFACE_SPEC.map((row) => (
                  <tr key={row.property} role="row">
                    <th scope="row" role="rowheader">{row.property}</th>
                    <td role="cell" data-col="The issuing authority">{row.authority}</td>
                    <td role="cell" data-col="The gate">{row.gate}</td>
                  </tr>
                ))}
                <tr role="row" className="landing__spec-shared">
                  <th scope="row" role="rowheader">Reads from</th>
                  <td role="cell" colSpan={2}>
                    Contract state — at request time in the console, at scan time
                    at the gate. Neither of them keeps a copy, which is the only
                    reason they can never disagree.
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="landing__note">
              Signing in decides which screens open. It never decides what the
              chain permits: a compromised session still cannot move an asset to
              someone without a valid credential, because that check is not in
              the session.
            </p>
          </div>
        </section>

        {/* The page ended on an aphorism with nowhere to go, and with half the
            dark panel empty. The line keeps its place; the other half now
            carries the ask. */}
        <section className="landing__close">
          <div className="landing__close-grid">
            <p className="display-serif landing__close-line">
              Ownership, permission and history become one cryptographic object
              that no administrator can rewrite.
            </p>

            <div className="landing__close-side">
              <p className="landing__close-lede">
                Three sign-ins — issuing authority, gate security, internal audit
                — reading one chain. Take any of them and try to move an asset
                you are not credentialled for.
              </p>
              <div className="landing__close-actions">
                <Link href="/login" className="landing__close-cta">
                  {session ? "Switch account" : "Sign in to the console"}
                </Link>
                <a href="#mechanism" className="landing__close-ghost">
                  Read the check
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing__foot">
        <p>Smart India Hackathon 2026 · Problem statement SIH26125</p>
        <p className="landing__foot-org">
          Bharat Electronics Limited · Ministry of Defence
        </p>
      </footer>

      <style>{`
        /* The sky is a component now (SkyBackdrop); the shell only has to give
           it something to be absolute inside, and a stacking context — at
           z-index -1 with no isolating ancestor it sinks behind the body's own
           background and disappears. */
        .landing-shell {
          position: relative;
          isolation: isolate;
          /* The mist bands bleed with width:100vw, which counts the scrollbar,
             so they spill ~8px and raise a horizontal scrollbar unless the
             shell absorbs it. clip rather than hidden: hidden would make
             this a scroll container. Safe for the backdrop, which spans with
             left/right:0 and so has nothing outside the shell to lose. */
          overflow-x: clip;
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
          padding: clamp(12px, 1.9vh, 26px) 0;
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
          /* Height-aware, not width-aware. Sized only in vw, the hero ignored
             how tall the screen actually is and pushed the reader off the
             fold on any laptop. */
          padding: clamp(8px, 1.7vh, 60px) 0 clamp(10px, 1.5vh, 40px);
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
          margin: clamp(10px, 1.7vh, 26px) 0 0;
          /* Wide enough that balance splits the sentence in two — at 19ch it
             broke into three, and the third line was two words long. The
             measure is in ch, so the split holds at every size in the clamp. */
          max-width: 28ch;
          /* min() so the smaller of the two constraints wins: a wide but short
             laptop screen gets the size its height can afford. */
          font-size: clamp(34px, min(6vw, 5.2vh), 74px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .landing__deck {
          margin: clamp(10px, 1.6vh, 24px) 0 0;
          max-width: 58ch;
          font-size: clamp(16px, min(1.45vw, 2vh), 20px);
          line-height: 1.5;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }

        .landing__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: clamp(14px, 2.1vh, 32px);
        }

        /* Keeps the section's rule off the very top edge when it is scrolled
           to from the hero link. */
        #mechanism { scroll-margin-top: 16px; }

        /* On a short screen the stacked composition cannot hold its full
           rhythm and still put the reader on one screen. Rather than shrink
           everything everywhere, the generous values stay for tall displays and
           only cramped ones tighten — type stays legible, spacing gives way. */
        @media (max-height: 950px) and (min-width: 760px) {
          .landing__bar { padding: clamp(8px, 1.3vh, 26px) 0; }
          .landing__badge { padding: 4px 14px 4px 5px; font-size: 13px; }
          .landing__headline { font-size: clamp(30px, min(5.6vw, 4.9vh), 74px); }
          .landing__actions { margin-top: clamp(10px, 1.6vh, 32px); }
          .landing__cta--lg { padding: 10px 22px; font-size: 16px; }
          .landing__ghost { padding: 9px 21px; font-size: 16px; }
        }

        /* --------------------------------------------------------- the stage */
        .landing__stage { margin-top: clamp(4px, 1.2vh, 20px); }

        /* -------------------------------------------------------- content */
        /* A full-bleed tone band. The container is 1180px wide, so the band is
           pulled out to the viewport and the shell clips what spills. Where a
           band runs, the section's rule comes off — two separators doing one
           job read as an accident, not as rhythm. */
        .mkt-section--band {
          /* The faint grey is specified against white and measures 4.48:1 on
             this tone — under the bar by a hair. Re-pointed within the band the
             same way the hero re-points its ramp over the sky photograph. */
          --mkt-faint: #6b7080;
          border-top: 0;
          /* Not a full rhythm unit: the following section brings its own top
             margin, and two of them stacked left the tone floating below the
             content it was meant to hold. */
          padding-bottom: clamp(48px, 6vw, 84px);
        }
        .mkt-section--band::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 0 auto 0 50%;
          width: 100vw;
          margin-left: -50vw;
          background: #fafafb;
        }

        /* ------------------------------------------------------ mechanism */
        .landing__mech {
          display: grid;
          gap: clamp(32px, 4vw, 56px);
          align-items: start;
        }
        @media (min-width: 1000px) {
          /* The excerpt takes the wider half: its measure is set by the source
             it quotes, while the claim beside it reads better narrow. */
          .landing__mech { grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr); }
        }
        .landing__mech-body { margin-top: clamp(18px, 2.2vw, 28px); }

        /* ---------------------------------------------------------- moves */
        .landing__steps {
          --step-pad: clamp(18px, 2vw, 26px);
          position: relative;
          list-style: none;
          padding: 0;
        }

        /* The spine. One line for the whole sequence, masked at both ends so it
           arrives and leaves rather than stopping dead against the first and
           last node. */
        .landing__steps::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 5px;
          width: 1px;
          background: #cfd2d8;
          -webkit-mask-image: linear-gradient(
            to bottom, transparent 0, #000 46px, #000 calc(100% - 46px), transparent 100%
          );
          mask-image: linear-gradient(
            to bottom, transparent 0, #000 46px, #000 calc(100% - 46px), transparent 100%
          );
        }

        .landing__step {
          position: relative;
          display: grid;
          gap: 8px 20px;
          padding: var(--step-pad) 0 var(--step-pad) 34px;
        }
        @media (min-width: 760px) {
          /* Wide enough for the longest label and no wider. At 150px the
             number floated in its own empty column, which read as a gap
             rather than as a margin. */
          .landing__step { grid-template-columns: 108px minmax(0, 1fr); }
        }

        .landing__step-node {
          position: absolute;
          left: 0;
          top: calc(var(--step-pad) + 4px);
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #fafafb;
          box-shadow: inset 0 0 0 1px #b6bac3;
        }

        /* The one move that is the whole argument. It used to be a peach card
           dropped into the list, which pushed its own row off the grid that
           made the list a sequence. The weight now comes from a filled node,
           ink body copy and the air around it — the grid stays intact. */
        .landing__step[data-emphasis="true"] {
          padding-top: calc(var(--step-pad) + 14px);
          padding-bottom: calc(var(--step-pad) + 14px);
        }
        /* The spine darkens for the length of the move that is the argument.
           A filled node alone was too quiet among five; the rail carrying ink
           through one row says the mechanism engages here, and says it in the
           material the section is already made of. */
        .landing__step[data-emphasis="true"]::before {
          content: "";
          position: absolute;
          left: 5px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--mkt-ink);
        }
        .landing__step[data-emphasis="true"] .landing__step-node {
          background: var(--mkt-ink);
          box-shadow: 0 0 0 4px #fafafb;
        }
        .landing__step[data-emphasis="true"] .landing__step-name { font-weight: 480; }
        .landing__step[data-emphasis="true"] .landing__step-body { color: var(--mkt-ink); }

        .landing__step-index {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin: 0;
          font-size: 14px;
          color: var(--mkt-faint);
        }
        .landing__step-name { color: var(--mkt-ink); }

        .landing__step-main { min-width: 0; }
        .landing__step-title { margin: 0; font-size: 21px; line-height: 1.3; }
        .landing__step-body {
          margin: 8px 0 0;
          max-width: 64ch;
          font-size: 16px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }

        /* ----------------------------------------------------------- spec */
        /* A specification, not two columns of prose: the reader compares along
           a row instead of holding one paragraph in their head while reading
           the other. */
        .landing__spec {
          width: 100%;
          /* Fixed, so the two surfaces get equal room. Auto layout sized them
             by how much text each happened to carry, which made the comparison
             look weighted before it was read. */
          table-layout: fixed;
          border-collapse: collapse;
          text-align: left;
        }
        .landing__spec-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
        .landing__spec th,
        .landing__spec td {
          padding: 20px 28px 20px 0;
          vertical-align: top;
          border-top: 1px solid var(--mkt-rule);
          font-weight: 400;
        }
        .landing__spec thead th {
          padding-top: 0;
          padding-bottom: 16px;
          border-top: 0;
          font-size: 20px;
          letter-spacing: -0.012em;
          color: var(--mkt-ink);
        }
        .landing__spec-corner { width: 168px; }
        .landing__spec th + th,
        .landing__spec td { width: auto; }
        .landing__spec th:last-child,
        .landing__spec td:last-child { padding-right: 0; }
        .landing__spec tbody th {
          font-size: 14px;
          color: var(--mkt-faint);
        }
        .landing__spec tbody td {
          font-size: 15.5px;
          line-height: 1.6;
          text-wrap: pretty;
          color: var(--mkt-muted);
        }

        /* The last row is the section's point: the two columns finally say one
           thing, so they become one cell under a rule dark enough to read as a
           join rather than as another divider. */
        .landing__spec-shared th,
        .landing__spec-shared td {
          padding-top: 22px;
          border-top: 1px solid var(--mkt-ink);
        }
        .landing__spec-shared td {
          max-width: 68ch;
          font-size: 16px;
          color: var(--mkt-ink);
        }

        @media (max-width: 760px) {
          /* Three columns do not survive a phone. The table restacks into
             labelled blocks and keeps its semantics. */
          .landing__spec,
          .landing__spec tbody,
          .landing__spec tr,
          .landing__spec th,
          .landing__spec td { display: block; width: auto; }
          .landing__spec thead { display: none; }
          .landing__spec tr {
            padding: 22px 0;
            border-top: 1px solid var(--mkt-rule);
          }
          .landing__spec tbody tr:first-child { border-top: 0; padding-top: 0; }
          .landing__spec th,
          .landing__spec td { padding: 0; border-top: 0; }
          .landing__spec tbody td { margin-top: 10px; }
          .landing__spec tbody td::before {
            content: attr(data-col);
            display: block;
            margin-bottom: 2px;
            font-size: 13px;
            color: var(--mkt-ink);
          }
          .landing__spec-corner { width: auto; }
          .landing__spec tr.landing__spec-shared { border-top-color: var(--mkt-ink); }
        }

        .landing__note {
          margin: clamp(32px, 4vw, 48px) 0 0;
          max-width: 70ch;
          font-size: 15px;
          line-height: 1.6;
          color: var(--mkt-muted);
        }

        /* ---------------------------------------------------------- close */
        /* The only dark surface in the system, so it is the page's full stop.
           It used to hold one line against half a panel of empty ink; the line
           keeps its place and the other half now carries the ask. */
        .landing__close {
          margin-top: var(--mkt-rhythm);
          padding: clamp(40px, 6vw, 76px) clamp(24px, 4vw, 60px);
          border-radius: 24px;
          background: var(--mkt-ink);
        }
        .landing__close-grid {
          display: grid;
          gap: clamp(32px, 4vw, 48px);
        }
        @media (min-width: 920px) {
          .landing__close-grid {
            grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
            gap: clamp(48px, 6vw, 88px);
          }
        }
        .landing__close-line {
          margin: 0;
          max-width: 23ch;
          font-size: clamp(26px, 3.4vw, 44px);
          line-height: 1.22;
          letter-spacing: -0.022em;
          text-wrap: balance;
          color: #fff;
        }

        /* Bottom-aligned against the serif line's top-left: the panel reads as
           one composition with two ends rather than as two stacked blocks. */
        .landing__close-side {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 22px;
        }
        .landing__close-lede {
          margin: 0;
          max-width: 44ch;
          font-size: 15.5px;
          line-height: 1.62;
          text-wrap: pretty;
          color: rgba(255, 255, 255, 0.76);
        }
        .landing__close-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* The pill pair, inverted for ink. Same geometry as the hero's, so the
           page opens and closes on the same control. */
        .landing__close-cta,
        .landing__close-ghost {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 11px 24px;
          font-size: 16px;
          transition: background-color 160ms ease-out, color 160ms ease-out;
        }
        .landing__close-cta {
          background: #fff;
          color: var(--mkt-ink);
        }
        .landing__close-cta:hover { background: #e7e7ea; }
        .landing__close-ghost {
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #fff;
        }
        .landing__close-ghost:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.7);
        }
        /* The browser's default ring is drawn in the page's own dark ink here,
           which is invisible against the panel. */
        .landing__close-cta:focus-visible,
        .landing__close-ghost:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
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
