"use client";

import { useEffect, useReducer } from "react";

/**
 * The gate reader, as a physical object.
 *
 * This is the moment the whole system is judged on: a guard holds a printed
 * card against a reader and gets one answer. Showing the device itself — with a
 * card in the slot and a verdict on its screen — is more immediately legible to
 * someone scanning the page for fifteen seconds than any diagram of a transfer,
 * and it is an artefact the system genuinely produces rather than a metaphor
 * for one.
 *
 * The four readings are the four values `RoleRegistry.checkRole()` can return:
 *
 *     enum InvalidReason { Valid, NeverGranted, Revoked, Expired }
 *
 * That is the point of cycling through all of them. A refusal here is never
 * just "denied" — the contract says *why*, and the three ways a credential can
 * fail are operationally different things: one was never issued, one was
 * withdrawn, one simply ran out. A guard needs to tell them apart, and so does
 * an auditor reading the trail afterwards.
 *
 * Four rules govern this component:
 *
 *   1. It renders a complete, meaningful verdict on first paint. Nothing is
 *      gated behind an observer or a transition, so a screenshot, a headless
 *      render or a hidden tab still shows the point being made.
 *   2. It never claims more than the code does. The reason names are the
 *      contract's own enum members and the call signature is real.
 *   3. Colour is evidence, not decoration. The device is monochrome until a
 *      refusal, so the one peach moment carries meaning.
 *   4. Under reduced motion it holds on the first refusal — the information is
 *      the verdict, not the sweep of the scan line.
 */

interface Reading {
  id: string;
  /** The controlled item. It is the subject of every reading. */
  asset: string;
  token: string;
  requires: string;
  /** Who presented a card for it — secondary, because the asset is the point. */
  presenter: string;
  presenterPost: string;
  /** Exactly one of the contract's InvalidReason members. */
  reason: "Valid" | "NeverGranted" | "Revoked" | "Expired";
  ok: boolean;
  detail: string;
  /** What happens to custody. The reason the check exists at all. */
  outcome: string;
}

/* Ordered so the first paint lands on a refusal — the differentiator — and the
   release arrives second, as the contrast that makes the refusal mean
   something. Every entry names the asset first: this platform governs custody
   of controlled equipment, and the credential is how it does that. A reader
   that led with the person would describe a badge system instead. */
const READINGS: Reading[] = [
  {
    id: "revoked",
    asset: "Signal Analyser SN-8823",
    token: "Token #1",
    requires: "Secret",
    presenter: "A. Deshpande",
    presenterPost: "Radar Systems · contractor",
    reason: "Revoked",
    ok: false,
    detail:
      "Withdrawn 2 Sep 2026, 11:04. The card still prints; the credential behind it does not.",
    outcome: "Asset not released. Custody unchanged.",
  },
  {
    id: "valid",
    asset: "Signal Analyser SN-8823",
    token: "Token #1",
    requires: "Secret",
    presenter: "Priya Menon",
    presenterPost: "Divisional Manager, Radar Systems",
    reason: "Valid",
    ok: true,
    detail: "Secret clearance issued 7 Mar 2026, valid for another 29 days.",
    outcome: "Asset released. Custody logged on chain.",
  },
  {
    id: "expired",
    asset: "Oscilloscope OS-2140",
    token: "Token #4",
    requires: "Secret",
    presenter: "S. Rao",
    presenterPost: "Instrumentation, Bay 4",
    reason: "Expired",
    ok: false,
    detail:
      "Nothing was revoked. The grant reached 14 Aug 2026 and lapsed on its own.",
    outcome: "Asset not released. Custody unchanged.",
  },
  {
    id: "never",
    asset: "Signal Analyser SN-8823",
    token: "Token #1",
    requires: "Secret",
    presenter: "Rahul Nair",
    presenterPost: "Technician, Radar Systems",
    reason: "NeverGranted",
    ok: false,
    detail: "No Secret clearance was ever issued to this holder.",
    outcome: "Asset not released. Custody unchanged.",
  },
];

/* The three registries the problem statement names, and the one record they
   make between them. This is the column that has to say what the platform is:
   identity, access control and asset custody, joined rather than adjacent. */
const REGISTRIES = [
  {
    facet: "Identity",
    contract: "IdentityRegistry",
    body: "A DID and a public key per person. Names and photographs never reach the chain.",
  },
  {
    facet: "Access control",
    contract: "RoleRegistry",
    body: "Grants with an expiry and a revocation flag. checkRole() returns one of four answers.",
  },
  {
    facet: "Asset custody",
    contract: "AssetToken",
    body: "Each item is a token bound to its holder's DID, carrying its own custody history.",
  },
];

const SCAN_MS = 720;
const HOLD_MS = 3400;

interface State {
  index: number;
  reading: boolean;
}

function step({ index, reading }: State): State {
  // Read, show the verdict, then move to the next card.
  return reading
    ? { index, reading: false }
    : { index: (index + 1) % READINGS.length, reading: true };
}

export function GateScanner() {
  // Starts on a settled verdict, not mid-scan, so the still frame carries the
  // argument on its own.
  const [{ index, reading }, advance] = useReducer(step, { index: 0, reading: false });

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setTimeout(advance, reading ? SCAN_MS : HOLD_MS);
    return () => clearTimeout(timer);
  }, [index, reading]);

  const current = READINGS[index]!;

  return (
    <figure
      className="scan"
      aria-label="A gate reader checking a printed ID card against the role registry"
    >
      <div className="scan__frame">
      <div className="scan__device" data-ok={current.ok} data-reading={reading}>
        <header className="scan__bezel">
          <span className="scan__post-name">Gate 3 · North Block</span>
          <span className="scan__link">
            <span className="scan__link-dot" aria-hidden="true" />
            reading chain state
          </span>
        </header>

        {/* One cell, four readings. The device takes the height of the tallest,
            so its screen never resizes as cards go through it — a reserved
            min-height would only be right at the width it was measured at. */}
        <div className="scan__screen" role="status" aria-live="polite">
          {READINGS.map((r, i) => (
            <div
              key={r.id}
              className="scan__read"
              data-on={i === index}
              data-ok={r.ok}
            >
              <p className="scan__verdict">
                {r.ok ? "Released" : "Refused"}
              </p>

              {/* The asset leads. The credential is how custody is decided, not
                  the thing being demonstrated. */}
              <p className="scan__name">{r.asset}</p>
              <p className="scan__post">
                {r.token} · requires <strong>{r.requires}</strong>
              </p>

              <p className="scan__cred">
                <span className="scan__by-label">presented by</span>
                <span className="scan__by">{r.presenter}</span>
                <span className="scan__expiry">{r.presenterPost}</span>
              </p>

              {/* The reason, in the contract's own words. */}
              <div className="scan__reason">
                <code className="scan__call">
                  checkRole() → InvalidReason.{r.reason}
                </code>
                <p className="scan__detail">{r.detail}</p>
              </div>

              <p className="scan__consequence">{r.outcome}</p>
            </div>
          ))}

          {/* Sits above the verdict while a card is being read. Absolutely
              positioned, so it cannot change the device's height. */}
          <div className="scan__reading" data-on={reading} aria-hidden="true">
            <span className="scan__reticle" />
            <span className="scan__reading-label">Reading credential…</span>
          </div>
        </div>

        {/* The reader slot, with a card held in it. The aperture clips the
            card; the mouth marks where it was clipped. */}
        <div className="scan__slot" aria-hidden="true">
          <div className="scan__aperture">
            <div className="scan__card">
              <span className="scan__card-photo" />
              <span className="scan__card-lines">
                <span className="scan__card-line scan__card-line--wide" />
                <span className="scan__card-line" />
              </span>
              <span className="scan__card-qr" />
            </div>
            <span className="scan__beam" data-on={reading} />
          </div>
          <span className="scan__mouth" />
        </div>
      </div>

      <figcaption className="scan__legend">
        <p className="scan__legend-title">
          One record, three registries.
        </p>
        <ul className="scan__reasons">
          {REGISTRIES.map((r) => (
            <li key={r.facet} className="scan__reason-row">
              <span className="scan__facet">
                {r.facet}
                <code className="scan__contract">{r.contract}</code>
              </span>
              <span className="scan__reason-gloss">{r.body}</span>
            </li>
          ))}
        </ul>
        <p className="scan__note">
          Every issue, revocation and transfer lands as a chain event, and the
          audit trail is replayed from those events — so there is no second
          version to reconcile.
        </p>
      </figcaption>
      </div>

      <style>{`
        .scan { margin: 0; min-width: 0; }

        /* The stage. hero-financial seats its product shot in a frame below the
           headline; this is that move in the project's own material — a flat
           mist surface rather than the block's backdrop-blur glass, which
           docs/PRODUCT.md rules out along with the rest of the gradient-and-glow
           vocabulary. */
        .scan__frame {
          display: grid;
          gap: clamp(24px, 3.4vw, 56px);
          align-items: center;
          padding: clamp(16px, 2.4vh, 44px) clamp(18px, 2.6vw, 44px);
          border-radius: 28px;
          background: #f2f2f3;
        }
        @media (min-width: 900px) {
          .scan__frame { grid-template-columns: minmax(0, 500px) minmax(0, 1fr); }
        }
        .scan__frame > * { min-width: 0; }

        /* ------------------------------------------------------------ legend */
        .scan__legend { margin: 0; }
        .scan__legend-title {
          margin: 0;
          font-family: var(--font-signifier);
          font-weight: 400;
          font-size: clamp(22px, 2.2vw, 28px);
          line-height: 1.2;
          letter-spacing: -0.018em;
          color: #17191c;
        }
        .scan__reasons {
          list-style: none;
          margin: clamp(12px, 1.7vh, 18px) 0 0;
          padding: 0;
        }
        .scan__reason-row {
          display: grid;
          gap: 2px 14px;
          padding: clamp(8px, 1.2vh, 11px) 0;
          border-top: 1px solid #e0e0e3;
        }
        @media (min-width: 520px) {
          .scan__reason-row { grid-template-columns: 150px minmax(0, 1fr); align-items: start; }
        }
        .scan__facet {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 14px;
          color: #17191c;
        }
        .scan__contract {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          letter-spacing: -0.01em;
          /* #6f7482 measures 4.17:1 on the mist frame — under the floor. */
          color: #616675;
        }
        .scan__reason-gloss {
          font-size: 13.5px;
          line-height: 1.5;
          text-wrap: pretty;
          color: #4f5461;
        }
        /* ------------------------------------------------------------ device */
        .scan__device {
          border-radius: 26px;
          background: #17191c;
          padding: clamp(9px, 1.3vh, 14px);
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.05),
            0 26px 60px -20px rgba(23, 25, 28, 0.42);
        }

        .scan__bezel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 2px 6px 12px;
          font-size: 11.5px;
        }
        .scan__post-name { color: #fff; }
        .scan__link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #a9adb5;
        }
        .scan__link-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #a9adb5;
        }

        /* ------------------------------------------------------------ screen */
        .scan__screen {
          position: relative;
          display: grid;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }
        .scan__read {
          grid-area: 1 / 1;
          padding: clamp(11px, 1.5vh, 18px) 20px clamp(11px, 1.5vh, 20px);
        }
        .scan__read[data-on="false"] { visibility: hidden; }

        .scan__verdict {
          display: inline-block;
          margin: 0;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: 0.01em;
          background: #17191c;
          color: #fff;
        }
        .scan__read[data-ok="false"] .scan__verdict {
          background: #5d2a1a;
          color: #fff;
        }

        .scan__name {
          margin: clamp(7px, 1vh, 13px) 0 0;
          font-size: clamp(18px, 2.2vh, 21px);
          line-height: 1.2;
          color: #17191c;
        }
        .scan__post {
          margin: 3px 0 0;
          font-size: 12.5px;
          color: #616675;
        }
        .scan__post strong { font-weight: 500; color: #17191c; }

        .scan__cred {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 6px 10px;
          margin: clamp(6px, 0.9vh, 12px) 0 0;
        }
        .scan__by-label { font-size: 11px; color: #6f7482; }
        .scan__by { font-size: 13.5px; color: #17191c; }
        .scan__expiry { font-size: 11.5px; color: #616675; }

        /* The reason block is the only part that changes colour, because the
           reason is the only part that changes meaning. */
        .scan__reason {
          margin-top: clamp(8px, 1.1vh, 14px);
          padding: clamp(8px, 1.1vh, 12px) 14px;
          border-radius: 12px;
          background: #f2f2f3;
        }
        .scan__read[data-ok="false"] .scan__reason { background: #fbe1d1; }

        .scan__call {
          display: block;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          letter-spacing: -0.01em;
          color: #616675;
        }
        .scan__read[data-ok="false"] .scan__call { color: #7a4230; }

        .scan__detail {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          text-wrap: pretty;
          color: #17191c;
        }
        .scan__read[data-ok="false"] .scan__detail { color: #5d2a1a; }

        .scan__consequence {
          margin: clamp(7px, 1vh, 12px) 0 0;
          font-size: 14px;
          line-height: 1.45;
          text-wrap: pretty;
          color: #17191c;
        }

        /* --------------------------------------------------------- scan pass */
        .scan__reading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #fff;
          visibility: hidden;
        }
        .scan__reading[data-on="true"] { visibility: visible; }

        .scan__reticle {
          width: 46px;
          height: 46px;
          border-radius: 10px;
          border: 2px solid #17191c;
          transform: scale(0.9);
        }
        .scan__reading[data-on="true"] .scan__reticle {
          animation: scan-pulse 720ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes scan-pulse {
          from { transform: scale(0.78); }
          to { transform: scale(0.9); }
        }
        .scan__reading-label { font-size: 12.5px; color: #616675; }

        /* ---------------------------------------------------------- the card */
        /* The slot: an aperture that clips the card, a mouth that marks the
           cut, and device body beneath. All three are needed. Clipped with
           nothing to mark the cut, the card read as a mockup running off the
           bottom of the frame rather than as card stock sunk into a reader. */
        .scan__slot {
          margin-top: clamp(6px, 1vh, 14px);
          padding: clamp(7px, 1vh, 14px) 6px clamp(5px, 0.7vh, 10px);
        }
        .scan__aperture {
          position: relative;
          overflow: hidden;
        }
        /* The slot edge casts a shadow across the stock going into it. Without
           it the card is evenly lit right up to the cut, which is what a
           truncated image looks like. */
        .scan__aperture::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 12px;
          background: linear-gradient(rgba(23, 25, 28, 0), rgba(23, 25, 28, 0.3));
        }
        .scan__card {
          /* Card proportions, not a full-width bar. At full width the photo and
             QR ended up at opposite edges and the whole thing read as a
             progress bar rather than a piece of card stock. */
          width: min(212px, 74%);
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: 9px 9px 3px 3px;
          background: #f2f2f3;
          /* How much of the card the reader has swallowed. It is added to the
             bottom padding as well as translated, so the visible card is the
             same height whatever the depth: blank stock below the row, and the
             cut never falls through the photo or the QR — sliced mid-block, it
             looked like a rendering fault. */
          --card-sunk: 16px;
          padding: 7px 11px calc(5px + var(--card-sunk));
          transform: translateY(var(--card-sunk));
        }
        /* The cut itself: darker than the device body, with its lower lip
           catching the light, the way a moulded slot does. */
        .scan__mouth {
          display: block;
          width: calc(min(212px, 74%) + 10px);
          height: 4px;
          margin: 0 auto;
          border-bottom: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 0 0 1px 1px;
          background: #000;
        }
        .scan__card-photo {
          width: 20px;
          height: 22px;
          border-radius: 4px;
          background: #d3d4d8;
          flex: none;
        }
        .scan__card-lines {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .scan__card-line {
          height: 5px;
          width: 46%;
          border-radius: 3px;
          background: #d3d4d8;
        }
        .scan__card-line--wide { width: 72%; background: #bcbec4; }
        .scan__card-qr {
          width: 22px;
          height: 22px;
          flex: none;
          border-radius: 3px;
          background-image:
            repeating-linear-gradient(0deg, #17191c 0 2px, transparent 2px 4px),
            repeating-linear-gradient(90deg, #17191c 0 2px, transparent 2px 4px);
          background-size: 4px 4px;
          opacity: 0.8;
        }

        /* The read itself. Sweeps once, only while a card is being read. */
        .scan__beam {
          position: absolute;
          left: 50%;
          width: min(212px, 74%);
          transform: translateX(-50%);
          top: 10px;
          height: 2px;
          border-radius: 2px;
          background: #fbe1d1;
          opacity: 0;
        }
        .scan__beam[data-on="true"] {
          animation: scan-beam 720ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* translateX is carried through every frame; dropping it would snap the
           beam back to the left edge the moment the animation starts. */
        @keyframes scan-beam {
          0% { opacity: 0; transform: translate(-50%, 0); }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, 40px); }
        }

        /* ---------------------------------------------------------- caption */
        .scan__note {
          margin: clamp(12px, 1.8vh, 20px) 0 0;
          max-width: 52ch;
          font-size: 13px;
          line-height: 1.55;
          text-wrap: pretty;
          color: #616675;
        }

        @media (max-height: 950px) and (min-width: 760px) {
          .scan__frame { padding: clamp(12px, 1.7vh, 44px) clamp(16px, 2.2vw, 44px); }
          .scan__device { padding: clamp(8px, 1.1vh, 14px); }
          .scan__bezel { padding: clamp(7px, 1.1vh, 13px) 20px; }
          .scan__read { padding: clamp(9px, 1.2vh, 18px) 20px clamp(9px, 1.2vh, 20px); }
          .scan__verdict { padding: 3px 11px; }
          .scan__cred { margin-top: clamp(5px, 0.7vh, 12px); }
          .scan__slot {
            margin-top: clamp(4px, 0.7vh, 14px);
            padding: clamp(5px, 0.8vh, 14px) 6px clamp(4px, 0.6vh, 10px);
          }
          .scan__card { --card-sunk: 14px; padding: 6px 11px calc(4px + var(--card-sunk)); }
          .scan__reason { margin-top: clamp(6px, 0.9vh, 14px); padding: clamp(7px, 1vh, 12px) 14px; }
          .scan__consequence { margin-top: clamp(6px, 0.8vh, 12px); }
          .scan__name { margin-top: clamp(6px, 0.8vh, 13px); }
          .scan__legend-title { font-size: clamp(20px, 2vw, 26px); }
        }

        /* 768-tall laptops are the tightest common case. */
        @media (max-height: 810px) and (min-width: 760px) {
          .scan__read { padding: 8px 18px 8px; }
          .scan__slot { margin-top: 3px; padding: 4px 6px 4px; }
          .scan__card { --card-sunk: 12px; padding: 5px 10px calc(4px + var(--card-sunk)); }
          .scan__detail { line-height: 1.45; }
          .scan__reason { margin-top: 6px; padding: 6px 12px; }
        }

        @media (max-width: 620px) {
          .scan__device { padding: 12px; }
          .scan__read { padding: 16px 16px 18px; }
          .scan__name { font-size: 19px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .scan__reticle,
          .scan__beam[data-on="true"] { animation: none; }
        }
      `}</style>
    </figure>
  );
}
