"use client";

import { useEffect, useReducer } from "react";

/**
 * The differentiator, demonstrated rather than described.
 *
 * The page's whole argument is that the asset refuses to move. Asserting that in
 * a paragraph is what every competing landing page does; showing a transfer
 * being refused, in the system's own visual language, is the thing a judge
 * remembers after forty other teams.
 *
 * It is drawn as the record the system actually produces — a transfer request
 * with a from, a to and a verdict — rather than as an abstract diagram. The
 * earlier version laid the two parties side by side across three columns, which
 * squeezed the asset name until it truncated mid-word and reduced the barrier to
 * a 2px hairline nobody could see. Stacking the movement vertically gives every
 * label its full width and makes the stop the largest gesture in the frame,
 * which is correct: the stop is the point.
 *
 * Four rules govern this component:
 *
 *   1. It renders its final, meaningful state on first paint. Nothing here is
 *      gated behind an observer or a transition, so a screenshot, a headless
 *      render or a hidden tab still shows the point being made.
 *   2. It never claims more than the contract does. The error name and the
 *      sentence are the ones `AssetToken._update` actually reverts with, and the
 *      terminal lines are copied from a real run of the demo script.
 *   3. Colour is evidence, not decoration. Everything is monochrome until the
 *      refusal, so the one peach moment carries meaning.
 *   4. Under reduced motion it stops on the refusal and stays there — the
 *      information is the outcome, not the animation.
 */

type Phase = "requested" | "checking" | "blocked";

const ORDER: Phase[] = ["requested", "checking", "blocked"];

/** Dwell time per phase. The refusal holds longest — it is the point. */
const DWELL: Record<Phase, number> = {
  requested: 1800,
  checking: 1400,
  blocked: 4600,
};

export function GateDemonstration() {
  // Starts on the refusal so the still frame carries the argument.
  const [phase, advance] = useReducer(
    (current: Phase) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!,
    "blocked",
  );

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setTimeout(advance, DWELL[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  const isBlocked = phase === "blocked";

  return (
    <figure
      className="gate"
      aria-label="A transfer being refused because the recipient holds no valid credential"
    >
      <div className="gate__panel" data-phase={phase}>
        <header className="gate__chrome">
          <code className="gate__call">AssetToken.transferFrom()</code>
          <span className="gate__status" data-blocked={isBlocked}>
            {isBlocked ? "reverted" : phase === "checking" ? "checking" : "pending"}
          </span>
        </header>

        <div className="gate__body">
          <div className="gate__asset">
            <p className="gate__asset-name">Signal Analyser SN-8823</p>
            <p className="gate__asset-meta">
              Token #1 · requires <strong>Manager</strong>
            </p>
          </div>

          {/* The movement, stacked so nothing has to truncate. */}
          <div className="gate__flow">
            <div className="gate__node">
              <span className="gate__node-label">From</span>
              <span className="gate__node-name">Priya Menon</span>
              <span className="gate__chip gate__chip--valid">Manager · valid</span>
            </div>

            <div className="gate__conduit" aria-hidden="true">
              <span className="gate__line" />
              <span className="gate__stop" data-blocked={isBlocked} />
            </div>

            <div className="gate__node">
              <span className="gate__node-label">To</span>
              <span className="gate__node-name">Rahul Nair</span>
              <span className="gate__chip" data-blocked={isBlocked}>
                Technician · no Manager credential
              </span>
            </div>
          </div>
        </div>

        {/* All three states are always in the DOM, stacked in one grid cell and
            hidden by visibility. Rendering them conditionally meant the panel
            resized as the phase changed — a reserved min-height only ever fixes
            that at the one width it was measured at, and this text wraps to
            different heights in every column. Sizing the cell to the tallest
            state costs nothing and is correct everywhere. */}
        <div className="gate__readout" role="status" aria-live="polite">
          <p className="gate__line-out" data-on={phase === "requested"}>
            <span className="gate__step">Transfer requested</span>
            <span className="gate__detail">
              from any client — this console, a script, anything
            </span>
          </p>

          <p className="gate__line-out" data-on={phase === "checking"}>
            <span className="gate__step">
              <code>RoleRegistry.checkRole()</code>
            </span>
            <span className="gate__detail">
              does the recipient hold a valid Manager credential?
            </span>
          </p>

          <div className="gate__refusal" data-on={isBlocked}>
            <p className="gate__refusal-head">
              Transfer blocked
              <code className="gate__error">TransferBlockedRoleNeverGranted</code>
            </p>
            <p className="gate__refusal-body">
              Recipient was never issued a Manager credential.
            </p>
            <p className="gate__refusal-foot">
              Reverted inside <code>AssetToken._update</code> — not refused by an
              interface.
            </p>
          </div>
        </div>
      </div>

      {/* The same call with no browser anywhere near it. Copied verbatim from a
          real run of `pnpm --filter @sih26125/chain demo`, because a claim about
          scripts is only worth making if the script's own output is what shows. */}
      <figcaption className="gate__cli">
        <span className="gate__cli-cmd">
          <span className="gate__cli-prompt">$</span> pnpm --filter @sih26125/chain demo
        </span>
        <span className="gate__cli-out gate__cli-out--stop">
          {"⛔"} Transfer blocked — Recipient was never issued a Manager credential.
        </span>
        <span className="gate__cli-out">
          {"✓"} Decoded on chain as TransferBlockedRoleNeverGranted
        </span>
      </figcaption>

      <style>{`
        /* min-width:0 matters here. The terminal strip below sets its lines
           nowrap, and a grid/flex item's automatic minimum size is its content,
           so without this the strip's longest line becomes a floor on the whole
           hero row and pushes the page into horizontal scroll on a phone. The
           strip scrolls inside itself instead. */
        .gate {
          margin: 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gate__panel {
          border: 1px solid #e7e7ea;
          border-radius: 22px;
          background: #fff;
          overflow: hidden;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 22px 54px -18px rgba(23, 25, 28, 0.22);
        }

        /* ------------------------------------------------------------ chrome */
        .gate__chrome {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 20px;
          border-bottom: 1px solid #f0f0f2;
        }
        .gate__call {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          letter-spacing: -0.01em;
          color: #616675;
        }
        .gate__status {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          background: #f2f2f3;
          color: #616675;
          transition: background-color 260ms ease-out, color 260ms ease-out;
        }
        .gate__status[data-blocked="true"] {
          background: #5d2a1a;
          color: #fff;
        }

        /* -------------------------------------------------------------- body */
        .gate__body { padding: 20px; }

        .gate__asset {
          padding: 14px 16px;
          border-radius: 14px;
          background: #f2f2f3;
        }
        .gate__asset-name {
          margin: 0;
          font-size: 15px;
          color: #17191c;
        }
        .gate__asset-meta {
          margin: 3px 0 0;
          font-size: 12px;
          color: #616675;
        }
        .gate__asset-meta strong { font-weight: 500; color: #17191c; }

        .gate__flow { margin-top: 18px; }

        .gate__node {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          align-items: baseline;
          gap: 4px 12px;
        }
        .gate__node-label {
          font-size: 11px;
          color: #6f7482;
        }
        .gate__node-name {
          font-size: 17px;
          color: #17191c;
        }
        .gate__chip {
          grid-column: 2;
          justify-self: start;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid #e7e7ea;
          color: #616675;
          transition: background-color 260ms ease-out, border-color 260ms ease-out,
            color 260ms ease-out;
        }
        .gate__chip--valid {
          background: #17191c;
          border-color: #17191c;
          color: #fff;
        }
        .gate__chip[data-blocked="true"] {
          background: #fbe1d1;
          border-color: #fbe1d1;
          color: #5d2a1a;
        }

        /* The conduit: the asset's path, and the thing that stops it. Scaled
           rather than resized, so nothing here triggers layout. */
        /* Aligned to 58px — the node grid's 46px label column plus its 12px gap
           — so the line starts under "Priya Menon" and ends under "Rahul Nair"
           rather than floating in the label gutter. It then reads as the path
           between the two people, which is what it is. */
        .gate__conduit {
          position: relative;
          height: 56px;
          margin: 10px 0 10px 58px;
        }
        .gate__line {
          position: absolute;
          left: 0;
          top: 0;
          width: 2px;
          height: 100%;
          border-radius: 2px;
          background: #d8d9dd;
          transform-origin: top;
          transform: scaleY(1);
          transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 260ms ease-out;
        }
        [data-phase="requested"] .gate__line { transform: scaleY(0.3); }
        [data-phase="blocked"] .gate__line {
          transform: scaleY(0.52);
          background: #5d2a1a;
        }

        /* The stop. Sized to be the largest gesture in the frame when it fires. */
        .gate__stop {
          position: absolute;
          left: -19px;
          top: 52%;
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: #5d2a1a;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1) 180ms,
            box-shadow 300ms ease-out 180ms;
        }
        .gate__stop[data-blocked="true"] {
          transform: scaleX(1);
          box-shadow: 0 0 0 8px #fbe1d1;
        }

        /* ----------------------------------------------------------- readout */
        /* One cell, three states. The grid takes the height of the tallest, so
           the panel is a fixed size at every width without a magic number.
           visibility:hidden also drops the inactive states out of the
           accessibility tree, so the live region announces only the current one. */
        .gate__readout {
          display: grid;
          padding: 0 20px 20px;
        }
        .gate__readout > * { grid-area: 1 / 1; }
        .gate__readout > [data-on="false"] { visibility: hidden; }

        .gate__line-out {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 0;
          padding: 18px 20px;
          border-radius: 16px;
          background: #fafafb;
        }
        .gate__step { font-size: 15px; color: #17191c; }
        .gate__step code, .gate__error {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 13px;
        }
        .gate__detail { font-size: 13px; color: #616675; }

        .gate__refusal {
          padding: 18px 20px;
          border-radius: 16px;
          background: #fbe1d1;
          color: #5d2a1a;
        }
        .gate__refusal-head {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin: 0;
          font-size: 15px;
        }
        /* 0.78 not 0.72: at 0.72 this composites to 4.46:1 on the peach, just
           under the 4.5:1 floor for text this size. */
        .gate__error { font-size: 11px; opacity: 0.78; }
        .gate__refusal-body {
          margin: 8px 0 0;
          font-size: 19px;
          line-height: 1.32;
          text-wrap: pretty;
        }
        .gate__refusal-foot {
          margin: 10px 0 0;
          font-size: 12.5px;
          line-height: 1.5;
          opacity: 0.82;
        }
        .gate__refusal-foot code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11.5px;
        }

        /* --------------------------------------------------------------- cli */
        .gate__cli {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 15px 18px;
          border-radius: 16px;
          background: #17191c;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11.5px;
          line-height: 1.5;
          overflow-x: auto;
        }
        .gate__cli span { white-space: nowrap; }
        .gate__cli-cmd { color: #fff; }
        .gate__cli-prompt { color: #8d919b; }
        .gate__cli-out { color: #c9cbd0; }
        .gate__cli-out--stop { color: #fbe1d1; }

        @media (max-width: 620px) {
          .gate__node { grid-template-columns: 1fr; }
          .gate__chip { grid-column: 1; }
          .gate__conduit { height: 40px; margin-left: 4px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gate__line, .gate__stop, .gate__status, .gate__chip { transition: none; }
        }
      `}</style>
    </figure>
  );
}
