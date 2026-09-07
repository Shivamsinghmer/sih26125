"use client";

import { useRef } from "react";

import { CustodyStack } from "./CustodyStack";
import { TimelineItem, TimelineStyles, useTimeline } from "./TimelineAnimation";
import {
  AuditMockup,
  CardMockup,
  DashboardMockup,
  GateMockup,
} from "./mockups/ProductMockups";

/**
 * The feature showcase, built from the feature1 recipe.
 *
 * `@ui-layouts-pro` is a private registry, so this is implemented from the
 * block's documented treatments rather than installed: the 14×24px grid ruled
 * background under a radial ellipse mask, the white fade overlays that let it
 * dissolve into the page, the radial accent wash, one shared TimelineAnimation
 * driving the reveal, and the InteractiveCardStack as the feature illustration.
 * Composition is 12-column with a lead feature about twice the supporting area,
 * and the 8px rhythm the spec asks for.
 *
 * One deliberate departure, stated rather than hidden: the mockups inside keep
 * the product's own palette. The chrome is marketing; the screenshots are the
 * application. A product shot restyled to match its own advertisement stops
 * being evidence.
 */

const CAPABILITIES = [
  {
    title: "Onboard without handing over a key",
    body: "A person is registered with a DID and a role credential. Their name and photo stay in Postgres; the chain gets an identifier, a public key and a status flag.",
  },
  {
    title: "Issue and revoke as facts, not rows",
    body: "A credential carries an expiry and can be withdrawn in one write. There is no permissions table an administrator could quietly edit instead.",
  },
  {
    title: "Print a card that stays true",
    body: "The QR encodes the DID, so the card points at a live credential. Revoke it and the print is stale the instant the guard scans it.",
  },
];

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const timeline = useTimeline(sectionRef);

  return (
    <section ref={sectionRef} className="showcase">
      <TimelineStyles />

      {/* Signature treatments, behind content and pointer-transparent. */}
      <div className="showcase__bg" aria-hidden="true">
        <div className="showcase__grid" />
        <div className="showcase__wash" />
        <div className="showcase__fade-top" />
        <div className="showcase__fade-bottom" />
      </div>

      <div className="showcase__inner">
        <header className="showcase__head">
          <TimelineItem order={0} timeline={timeline}>
            <h2 className="display-serif showcase__title">
              Four surfaces, one record underneath.
            </h2>
          </TimelineItem>
          <TimelineItem order={1} timeline={timeline} as="p" className="showcase__sub">
            An issuing authority, a gate post, an auditor and a printed card. Each
            sees exactly what its job needs, and none of them can disagree about
            what is true — because none of them keeps its own copy.
          </TimelineItem>
        </header>

        {/* Lead: the console, roughly twice the supporting area. */}
        <div className="showcase__lead-row">
          <TimelineItem order={2} timeline={timeline} as="figure" className="showcase__lead">
            <DashboardMockup />
            <figcaption className="showcase__cap">
              <strong>The console.</strong> Every figure read from contract state
              at request time, so the dashboard and the chain cannot drift apart.
            </figcaption>
          </TimelineItem>

          <TimelineItem order={3} timeline={timeline} as="figure" className="showcase__support-fig">
            <CardMockup />
            <figcaption className="showcase__cap">
              <strong>The card.</strong> Photo for a human to match, QR for a
              scanner to verify. Nothing on it can be trusted except the QR.
            </figcaption>
          </TimelineItem>
        </div>

        <div className="showcase__pair">
          <TimelineItem order={4} timeline={timeline} as="figure" className="showcase__fig">
            <GateMockup />
            <figcaption className="showcase__cap">
              <strong>The gate.</strong> One question — is this credential valid
              right now — and the refusal is as legible as the pass.
            </figcaption>
          </TimelineItem>

          <TimelineItem order={5} timeline={timeline} as="figure" className="showcase__fig">
            <AuditMockup />
            <figcaption className="showcase__cap">
              <strong>The replay.</strong> Filterable, paged, and reconstructed
              from chain events rather than queried from a log.
            </figcaption>
          </TimelineItem>
        </div>

        <div className="showcase__split">
          <TimelineItem order={6} timeline={timeline} as="figure" className="showcase__stack">
            <CustodyStack />
            <figcaption className="showcase__cap">
              <strong>The record itself.</strong> Four entries from one asset,
              including the transfer that was refused.
            </figcaption>
          </TimelineItem>

          <ul className="showcase__caps">
            {CAPABILITIES.map((item, index) => (
              <TimelineItem
                key={item.title}
                order={7 + index}
                timeline={timeline}
                as="li"
                className="showcase__cap-item"
              >
                <h3 className="showcase__cap-title">{item.title}</h3>
                <p className="showcase__cap-body">{item.body}</p>
              </TimelineItem>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        .showcase {
          position: relative;
          isolation: isolate;
          margin-top: clamp(96px, 12vw, 144px);
          padding: clamp(64px, 8vw, 112px) 0 clamp(56px, 7vw, 96px);
        }

        /* ---- feature1 signature treatments, behind everything ---- */
        .showcase__bg {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          border-radius: 28px;
        }

        /* Ruled grid under a radial ellipse mask. */
        .showcase__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, #b0b0b02e 1px, transparent 1px),
            linear-gradient(to bottom, #b0b0b02e 1px, transparent 1px);
          background-size: 14px 24px;
          -webkit-mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%);
          mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%);
        }

        /* The accent wash. Held at low opacity so the mockups stay the focal
           point and body text keeps its contrast. */
        .showcase__wash {
          position: absolute;
          inset: 0;
          background: radial-gradient(125% 125% at 50% 10%, #ffffff00 40%, #6366f1 100%);
          opacity: 0.14;
        }

        .showcase__fade-top {
          position: absolute;
          inset: 0 0 auto 0;
          height: 128px;
          background: linear-gradient(to bottom, #fff, #fff, transparent);
        }
        .showcase__fade-bottom {
          position: absolute;
          inset: auto 0 0 0;
          height: 160px;
          background: linear-gradient(to top, #fff, #fff, transparent);
        }

        /* ---- composition ---- */
        .showcase__inner {
          position: relative;
          max-width: 1180px;
          margin: 0 auto;
        }

        .showcase__head { max-width: 34ch; }
        .showcase__title {
          margin: 0;
          font-size: clamp(28px, 3.4vw, 46px);
          line-height: 1.16;
          letter-spacing: -0.022em;
          text-wrap: balance;
          color: #17191c;
        }
        .showcase__sub {
          margin: 20px 0 0;
          max-width: 58ch;
          font-size: 17px;
          line-height: 1.6;
          text-wrap: pretty;
          color: #616675;
        }

        /* 8px rhythm: 24-32 inside groups, 48-72 between groups. */
        .showcase__lead-row,
        .showcase__pair,
        .showcase__split {
          display: grid;
          gap: 32px;
          margin-top: 64px;
          align-items: start;
        }
        @media (min-width: 940px) {
          /* Lead feature ~2x the supporting card. */
          .showcase__lead-row { grid-template-columns: minmax(0, 1.95fr) minmax(0, 1fr); }
          .showcase__pair { grid-template-columns: 1fr 1fr; }
          .showcase__split { grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 56px; }
        }

        .showcase__lead,
        .showcase__support-fig,
        .showcase__fig,
        .showcase__stack { margin: 0; }

        .showcase__cap {
          margin-top: 14px;
          max-width: 46ch;
          font-size: 13px;
          line-height: 1.55;
          color: #616675;
        }
        .showcase__cap strong { color: #17191c; font-weight: 500; }

        .showcase__caps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .showcase__cap-item {
          padding: 24px 0;
          border-top: 1px solid #e7e7ea;
        }
        .showcase__cap-item:first-child { border-top: 0; padding-top: 0; }
        .showcase__cap-title {
          margin: 0;
          font-size: 17px;
          line-height: 1.35;
          color: #17191c;
        }
        .showcase__cap-body {
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
