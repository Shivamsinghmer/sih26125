"use client";

import { useRef } from "react";

import { CustodyStack } from "./CustodyStack";
import { TimelineItem, TimelineStyles, useTimeline } from "./TimelineAnimation";

/**
 * The feature section: an asymmetric lead-and-support composition on one shared
 * reveal timeline, with the card stack as the product proof.
 *
 * Follows the feature1 structure — ordered timeline reveal, a depth-driven
 * stack as the illustration, one dominant focal point, a 12-column feel with
 * the lead feature taking roughly twice the supporting area — but in Steep's
 * own materials. The signature treatments carried through are this system's
 * own, not another block's: the peach accent used exactly once, and hairline
 * rules instead of gradient fills.
 */

const SUPPORTING = [
  {
    title: "Every entry is a transaction",
    body: "Not a row describing one. There is no second record that could drift out of step with the chain, because there is no second record.",
  },
  {
    title: "Reconstructed, never trusted",
    body: "The history is replayed from chain events on load. The index exists to make querying fast, and can be dropped and rebuilt from block zero at any time.",
  },
  {
    title: "Survives the network being gone",
    body: "An exported bundle verifies with the cable pulled — signature, credential and custody chain — and states plainly how old its revocation data is.",
  },
];

export function CustodyFeature() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const timeline = useTimeline(sectionRef);

  return (
    <section ref={sectionRef} className="feature">
      <TimelineStyles />

      <div className="feature__head">
        <TimelineItem order={0} timeline={timeline} as="p" className="feature__kicker">
          Chain of custody
        </TimelineItem>
        <TimelineItem order={1} timeline={timeline}>
          <h2 className="display-serif feature__title">
            An asset carries its own history, not a reference to one.
          </h2>
        </TimelineItem>
      </div>

      <div className="feature__body">
        {/* Lead: the proof, roughly twice the supporting area. */}
        <TimelineItem order={2} timeline={timeline} as="figure" className="feature__lead">
          <CustodyStack />
          <figcaption className="feature__caption">
            Four entries from one asset&rsquo;s real record, including the transfer
            that was refused.
          </figcaption>
        </TimelineItem>

        <ul className="feature__support">
          {SUPPORTING.map((item, index) => (
            <TimelineItem
              key={item.title}
              order={3 + index}
              timeline={timeline}
              as="li"
              className="feature__point"
            >
              <h3 className="feature__point-title">{item.title}</h3>
              <p className="feature__point-body">{item.body}</p>
            </TimelineItem>
          ))}
        </ul>
      </div>

      <style>{`
        .feature {
          padding-top: clamp(56px, 8vw, 104px);
          border-top: 1px solid var(--color-mist-gray, #f2f2f3);
        }

        .feature__head { max-width: 30ch; }

        /* One named kicker, used once on the page — voice rather than the
           per-section scaffolding it becomes when repeated. */
        .feature__kicker {
          margin: 0 0 12px;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6f7482;
        }

        .feature__title {
          margin: 0;
          font-size: clamp(27px, 3.2vw, 42px);
          line-height: 1.2;
          letter-spacing: -0.02em;
          text-wrap: balance;
          color: var(--color-ink-black, #17191c);
        }

        .feature__body {
          display: grid;
          gap: clamp(32px, 5vw, 64px);
          margin-top: clamp(36px, 5vw, 56px);
          align-items: start;
        }
        @media (min-width: 900px) {
          /* Lead takes about twice the supporting column. */
          .feature__body { grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr); }
        }

        .feature__lead { margin: 0; }
        .feature__caption {
          margin-top: 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #6f7482;
        }

        .feature__support {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .feature__point {
          padding: 22px 0;
          border-top: 1px solid var(--color-mist-gray, #f2f2f3);
        }
        .feature__point:first-child { border-top: 0; padding-top: 0; }

        .feature__point-title {
          margin: 0;
          font-size: 17px;
          line-height: 1.35;
          color: var(--color-ink-black, #17191c);
        }
        .feature__point-body {
          margin: 6px 0 0;
          font-size: 15px;
          line-height: 1.6;
          text-wrap: pretty;
          color: #616675;
        }
      `}</style>
    </section>
  );
}
