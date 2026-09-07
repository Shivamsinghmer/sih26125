"use client";

import { useEffect, useReducer } from "react";

/**
 * The differentiator, demonstrated rather than described.
 *
 * The page's whole argument is that the token refuses to move. Asserting that in
 * a paragraph is what every competing landing page does; showing a transfer
 * being refused, in the system's own visual language, is the thing a judge
 * remembers after forty other teams.
 *
 * Three rules govern this component:
 *
 *   1. It renders its final, meaningful state on first paint. Nothing here is
 *      gated behind an observer or a transition, so a screenshot, a headless
 *      render or a hidden tab still shows the point being made.
 *   2. It never claims more than the contract does. The error names and the
 *      sentence are the ones `AssetToken._update` actually reverts with.
 *   3. Under reduced motion it stops on the refusal and stays there — the
 *      information is the outcome, not the animation.
 */

type Phase = "requested" | "checking" | "blocked";

const ORDER: Phase[] = ["requested", "checking", "blocked"];

/** Dwell time per phase. The refusal holds longest — it is the point. */
const DWELL: Record<Phase, number> = {
  requested: 1900,
  checking: 1500,
  blocked: 4200,
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
  const isChecking = phase === "checking";

  return (
    <figure className="gate" aria-label="A transfer being refused because the recipient holds no valid credential">
      <div className="gate__ledger" data-phase={phase}>
        <div className="gate__party">
          <span className="gate__who">Priya Menon</span>
          <span className="gate__role gate__role--valid">Manager</span>
        </div>

        <div className="gate__track">
          <span className="gate__asset" aria-hidden="true">
            <span className="gate__asset-label">Signal Analyser SN-8823</span>
          </span>
          <span className="gate__barrier" data-blocked={isBlocked} aria-hidden="true" />
        </div>

        <div className="gate__party gate__party--end">
          <span className="gate__who">Rahul Nair</span>
          <span className="gate__role">Technician · no Manager credential</span>
        </div>
      </div>

      <div className="gate__readout" role="status" aria-live="polite">
        {phase === "requested" ? (
          <p className="gate__line">
            <span className="gate__step">Transfer requested</span>
            <span className="gate__detail">
              from any client — this console, a script, anything
            </span>
          </p>
        ) : null}

        {isChecking ? (
          <p className="gate__line">
            <span className="gate__step">
              <code>RoleRegistry.checkRole()</code>
            </span>
            <span className="gate__detail">
              does the recipient hold a valid Manager credential?
            </span>
          </p>
        ) : null}

        {isBlocked ? (
          <div className="gate__refusal">
            <p className="gate__refusal-head">
              Transfer blocked
              <code className="gate__error">TransferBlockedRoleNeverGranted</code>
            </p>
            <p className="gate__refusal-body">
              Recipient was never issued a Manager credential.
            </p>
            <p className="gate__refusal-foot">
              Reverted inside <code>AssetToken._update</code> — not refused by an
              interface. The same call from a script fails identically.
            </p>
          </div>
        ) : null}
      </div>

      <style>{`
        .gate {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .gate__ledger {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(90px, 1.15fr) minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          padding: 22px 20px;
          border: 1px solid var(--color-mist-gray, #f2f2f3);
          border-radius: 20px;
          background: var(--surface-canvas, #fff);
        }

        .gate__party {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .gate__party--end { align-items: flex-end; text-align: right; }

        .gate__who {
          font-size: 15px;
          color: var(--color-ink-black, #17191c);
        }
        .gate__role {
          font-size: 12px;
          color: var(--color-slate-gray, #777b86);
        }
        .gate__role--valid {
          align-self: flex-start;
          background: var(--color-ink-black, #17191c);
          color: var(--color-paper-white, #fff);
          border-radius: 999px;
          padding: 2px 10px;
        }

        /* The track: the asset travels, the barrier stops it. */
        .gate__track {
          position: relative;
          height: 46px;
          display: flex;
          align-items: center;
        }

        .gate__asset {
          position: absolute;
          left: 0;
          display: inline-flex;
          align-items: center;
          height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          background: var(--color-mist-gray, #f2f2f3);
          color: var(--color-ink-black, #17191c);
          white-space: nowrap;
          font-size: 11px;
          transform: translateX(0);
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .gate__asset-label {
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        /* Advances toward the barrier, then is knocked back by it. */
        [data-phase="checking"] .gate__asset { transform: translateX(38%); }
        [data-phase="blocked"] .gate__asset { transform: translateX(14%); }

        .gate__barrier {
          position: absolute;
          right: 8%;
          top: 2px;
          bottom: 2px;
          width: 2px;
          border-radius: 2px;
          background: var(--color-smoke-gray, #a3a6af);
          transition: background-color 260ms ease-out, box-shadow 260ms ease-out;
        }
        .gate__barrier[data-blocked="true"] {
          background: var(--color-sienna-brown, #5d2a1a);
          box-shadow: 0 0 0 5px var(--color-blush-peach, #fbe1d1);
        }

        .gate__readout { min-height: 132px; }

        .gate__line {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 0;
          padding: 18px 20px;
          border-radius: 16px;
          background: var(--surface-section-fog, #fafafb);
        }
        .gate__step {
          font-size: 15px;
          color: var(--color-ink-black, #17191c);
        }
        .gate__step code, .gate__error {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 13px;
        }
        .gate__detail {
          font-size: 13px;
          color: var(--color-slate-gray, #777b86);
        }

        .gate__refusal {
          padding: 20px 22px;
          border-radius: 16px;
          background: var(--surface-accent-blush, #fbe1d1);
          color: var(--color-sienna-brown, #5d2a1a);
        }
        .gate__refusal-head {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin: 0;
          font-size: 17px;
        }
        .gate__error { opacity: 0.62; }
        .gate__refusal-body {
          margin: 8px 0 0;
          font-size: 20px;
          line-height: 1.35;
        }
        .gate__refusal-foot {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.78;
        }
        .gate__refusal-foot code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .gate__ledger { grid-template-columns: 1fr; gap: 10px; }
          .gate__party--end { align-items: flex-start; text-align: left; }
          .gate__track { height: 30px; }
          .gate__asset-label { max-width: 190px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gate__asset, .gate__barrier { transition: none; }
        }
      `}</style>
    </figure>
  );
}
