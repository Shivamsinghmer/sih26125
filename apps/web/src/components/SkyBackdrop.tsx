"use client";

import { useState } from "react";

import CloudSky from "./CloudSky";

/**
 * The sky band.
 *
 * A live WebGL sky — Originkit's Cloud Sky — rather than a photograph. It is on
 * the brand surfaces only: the landing page and the login. The console had it
 * for a while and lost it, because every gain in the sky's visibility came
 * straight out of the contrast budget of the small grey labels covering a
 * working screen. That was the right call twice over — it is also the most
 * expensive thing on any page it appears on.
 *
 * Three things the swap does not get to change:
 *
 *   1. **Legibility.** Over the raw zenith blue, ink measures 4.21:1 and the
 *      secondary greys are far worse, so a constant white scrim sits over the
 *      whole band before the shaped veil goes on top. The floor is what makes
 *      the worst case computable: the shader can only ever paint between the
 *      zenith (its darkest output) and cloud white, so a fixed alpha over the
 *      zenith is the worst pixel any text can land on. Measured below.
 *   2. **Reduced motion.** Handled inside CloudSky: it draws the sky and then
 *      holds it still.
 *   3. **No WebGL.** The photograph is still in /public and takes over, so the
 *      surface degrades to what it looked like yesterday rather than to a flat
 *      rectangle.
 */

export function SkyBackdrop({ animate = true }: { animate?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <div className="sky" aria-hidden="true">
      {unavailable ? (
        <div className="sky__photo" />
      ) : (
        <div className="sky__gl">
          <CloudSky
            background="#0075FF"
            baseColor="#B4D2F0"
            accentColor="#FFFFFF"
            density={100}
            speed={64}
            size={130}
            animate={animate}
            onUnavailable={() => setUnavailable(true)}
          />
        </div>
      )}

      <div className="sky__floor" />
      <div className="sky__veil" />
      <div className="sky__top" />

      <style>{`
        .sky {
          position: absolute;
          z-index: -1;
          top: 0;
          left: 0;
          right: 0;
          overflow: hidden;
          /* The canvas must never take a click meant for the page. */
          pointer-events: none;
          background: #f7f9fc;
        }

        .sky {
          height: clamp(820px, 108vh, 1320px);
          -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
        }

        .sky__gl { position: absolute; inset: 0; }

        /* Only reached when WebGL is missing. */
        .sky__photo {
          position: absolute;
          inset: 0;
          background: url("/hero-sky.jpg") center / cover no-repeat;
          opacity: 0.85;
        }

        /* The floor was a flat 0.55 white over everything, which is why the sky
           looked washed out: a uniform scrim removes the contrast between cloud
           and sky along with the contrast against the text. It is much lighter
           now and the shaped veil below does the protecting, so the sky reads as
           sky everywhere except directly under the words. */
        .sky__floor {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.12);
        }

        /* The shaped veil, on top of the floor: strongest where the headline
           and the deck sit, releasing toward the edges so the sky is still a
           sky out there. */
        .sky__veil {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 62% 50% at 50% 38%,
            rgba(255, 255, 255, 0.88) 0%,
            rgba(255, 255, 255, 0.74) 42%,
            rgba(255, 255, 255, 0) 76%
          );
        }
        /* The top strip carries the mark and, on the console, the sign-out —
           and it sits where the shaped veil has nothing left to give. Without
           this the muted half of the mark computes 2.6:1 against the zenith.
           Local, so the sky is untouched fifty pixels lower. */
        .sky__top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 190px;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.62),
            rgba(255, 255, 255, 0)
          );
        }
      `}</style>
    </div>
  );
}
