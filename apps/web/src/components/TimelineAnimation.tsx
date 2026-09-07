"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Ordered composition reveal.
 *
 * One IntersectionObserver on the section drives a single shared timeline;
 * children enter by their `order` rather than each animating independently.
 * That is the whole point of the primitive — a sequence reads as one
 * composition assembling itself, where per-element animations read as noise.
 *
 * Two rules it does not break:
 *
 *   - The final state is the default. Content is never gated behind the
 *     transition, so a headless render, a hidden tab or a failed observer still
 *     ships the section fully visible. Only the *entrance* is conditional.
 *   - Reduced motion means arrival, not absence: everything is simply already
 *     in place.
 */

const STEP_MS = 120;

interface TimelineContextValue {
  started: boolean;
  reduced: boolean;
}

export function useTimeline(sectionRef: React.RefObject<HTMLElement | null>): TimelineContextValue {
  // Visible by default. The entrance is opt-in, so no failure of observation,
  // timing or rendering can leave the section blank — the animation can only
  // ever be skipped, never inverted into hiding content.
  const [started, setStarted] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReduced(prefersReduced);

    const section = sectionRef.current;
    if (prefersReduced || !section || typeof IntersectionObserver === "undefined") return;

    // Only worth animating if the section is still below the fold. Anything
    // already on screen has been seen; fading it in would be a flicker.
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return;

    setStarted(false);

    let settled = false;
    const reveal = () => {
      if (settled) return;
      settled = true;
      setStarted(true);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(section);

    // Failsafe. Some renderers — headless captures, background tabs, the odd
    // embedded browser — create an observer that never fires a callback at all.
    // Without this the content stays at opacity 0 permanently, which is a blank
    // section rather than a missed animation.
    const failsafe = setTimeout(reveal, 1600);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [sectionRef]);

  return { started, reduced };
}

export function TimelineItem({
  order,
  timeline,
  as: Tag = "div",
  className,
  children,
}: {
  /** Position in the shared sequence. Integers, starting at 0. */
  order: number;
  timeline: TimelineContextValue;
  as?: "div" | "li" | "p" | "figure";
  className?: string;
  children: ReactNode;
}) {
  const { started, reduced } = timeline;

  return (
    <Tag
      className={className}
      data-timeline={reduced ? "static" : started ? "in" : "out"}
      style={reduced ? undefined : { transitionDelay: `${order * STEP_MS}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Shared entrance styling, injected once by the section that owns a timeline. */
export function TimelineStyles() {
  return (
    <style>{`
      [data-timeline] {
        transition: opacity 520ms cubic-bezier(0.22, 1, 0.36, 1),
                    transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      [data-timeline="out"] { opacity: 0; transform: translateY(14px); }
      [data-timeline="in"],
      [data-timeline="static"] { opacity: 1; transform: none; }

      @media (prefers-reduced-motion: reduce) {
        [data-timeline] { transition: none; opacity: 1; transform: none; }
      }
    `}</style>
  );
}

export function useTimelineRef() {
  return useRef<HTMLElement | null>(null);
}
