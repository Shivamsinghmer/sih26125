"use client";

import { useState } from "react";

/**
 * Depth-driven feature illustration: a chain of custody as an actual stack.
 *
 * The primitive is an overlapping card stack whose transform, scale, opacity
 * and z-index all derive from index, with the active card promoted forward.
 * Here it carries real meaning rather than decoration — a custody chain *is* a
 * stack of records, each one a transaction, and bringing one forward is reading
 * that entry.
 *
 * Interaction is not the only way in: every card is a real button, reachable by
 * keyboard and announced, and the stack renders fully composed before any
 * interaction happens.
 */

interface Entry {
  id: string;
  event: string;
  detail: string;
  meta: string;
  /** The one entry that is a refusal rather than a movement. */
  refusal?: boolean;
}

const ENTRIES: Entry[] = [
  {
    id: "mint",
    event: "Asset registered",
    detail: "Signal Analyser SN-8823 minted to Priya Menon, requiring Secret clearance to hold.",
    meta: "block 302 · AssetToken",
  },
  {
    id: "credential",
    event: "Credential issued",
    detail: "Secret clearance granted to Priya Menon by S. Raghavan, valid until 6 Oct 2026.",
    meta: "block 304 · RoleRegistry",
  },
  {
    id: "blocked",
    event: "Transfer refused",
    detail: "Rahul Nair was never issued a Secret clearance. Reverted in AssetToken._update.",
    meta: "TransferBlockedRoleNeverGranted",
    refusal: true,
  },
  {
    id: "revoked",
    event: "Credential revoked",
    detail: "Priya Menon's Secret clearance withdrawn — one write, visible to every verifier.",
    meta: "block 311 · RoleRegistry",
  },
];

export function CustodyStack() {
  const [active, setActive] = useState(2); // opens on the refusal

  return (
    <div className="stack">
      <ul className="stack__cards">
        {ENTRIES.map((entry, index) => {
          const offset = index - active;
          const isActive = offset === 0;

          return (
            <li
              key={entry.id}
              className="stack__slot"
              style={{
                // Index-derived depth: behind cards sink back and fade.
                transform: `translateY(${offset * 14}px) scale(${1 - Math.abs(offset) * 0.035})`,
                zIndex: ENTRIES.length - Math.abs(offset),
                opacity: Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.22,
                pointerEvents: Math.abs(offset) > 2 ? "none" : "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={isActive ? "true" : undefined}
                className="stack__card"
                data-refusal={entry.refusal ? "true" : undefined}
                data-active={isActive ? "true" : undefined}
              >
                <span className="stack__event">{entry.event}</span>
                <span className="stack__detail">{entry.detail}</span>
                <span className="stack__meta">{entry.meta}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="stack__hint">
        {active + 1} of {ENTRIES.length} — select an entry to bring it forward
      </p>

      <style>{`
        .stack { display: flex; flex-direction: column; gap: 18px; }

        .stack__cards {
          position: relative;
          list-style: none;
          margin: 0;
          padding: 0;
          height: 232px;
        }

        .stack__slot {
          position: absolute;
          inset: 0;
          transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
                      opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .stack__card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          height: 100%;
          text-align: left;
          padding: 22px 24px;
          border-radius: 20px;
          border: 1px solid var(--color-mist-gray, #f2f2f3);
          background: var(--surface-canvas, #fff);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 12px 28px rgba(0,0,0,0.06);
          cursor: pointer;
          transition: border-color 200ms ease-out;
        }
        .stack__card:hover { border-color: var(--color-slate-gray, #777b86); }
        .stack__card:focus-visible {
          outline: 2px solid var(--color-ink-black, #17191c);
          outline-offset: 3px;
        }

        /* The refusal is the one card that carries the accent — same rule as
           everywhere else in this system. */
        .stack__card[data-refusal="true"] {
          background: var(--surface-accent-blush, #fbe1d1);
          border-color: transparent;
        }

        .stack__event {
          font-size: 13px;
          /* Steep's slate-gray is specified for links and tertiary labels; at
             13px on white it measures 4.23:1, under the floor for text. */
          color: #616675;
        }
        .stack__card[data-refusal="true"] .stack__event { color: #7a4230; }

        .stack__detail {
          font-family: var(--font-signifier), ui-serif, Georgia, serif;
          font-size: 21px;
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: var(--color-ink-black, #17191c);
        }
        .stack__card[data-refusal="true"] .stack__detail { color: var(--color-sienna-brown, #5d2a1a); }

        .stack__meta {
          margin-top: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11px;
          color: #6f7482;
        }
        .stack__card[data-refusal="true"] .stack__meta { color: #7a4230; }

        .stack__hint {
          margin: 0;
          font-size: 13px;
          color: #6f7482;
        }

        @media (prefers-reduced-motion: reduce) {
          .stack__slot, .stack__card { transition: none; }
        }
      `}</style>
    </div>
  );
}
