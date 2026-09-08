/**
 * The sky band, as one component.
 *
 * Adapted from the @ui-layouts/hero-financial block: a pale base, the sky
 * photograph at partial opacity, two blurred gradient bars in the top-left
 * corner, and a blue wash over the first stretch of the page. It began as
 * markup inlined in the landing page; the login and the console shell need the
 * same backdrop, and three copies of a four-layer composite would drift.
 *
 * The photograph is served from /hero-sky.jpg rather than hotlinked from
 * Unsplash. This demo is expected to run on a closed network, and a backdrop
 * that needs a CDN comes up bare there.
 *
 * Two rules govern it:
 *
 *   1. The parent must be `position: relative` and `isolation: isolate`. The
 *      band paints at z-index -1, and without an isolating ancestor it would
 *      sink behind the body's own background and vanish.
 *   2. Legibility is not left to chance over a photograph. A white veil sits
 *      over the middle of the band, and every variant's text was measured
 *      against the composited result rather than assumed — Steep's secondary
 *      greys measure 2.9:1 against the photograph's darkest pixel.
 */

type Variant = "hero" | "page";

export function SkyBackdrop({ variant = "page" }: { variant?: Variant }) {
  return (
    <div className="sky" data-variant={variant} aria-hidden="true">
      <div className="sky__photo" />

      <svg
        className="sky__blobs"
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
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
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
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
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

      <div className="sky__wash" />
      <div className="sky__veil" />

      <style>{`
        .sky {
          position: absolute;
          z-index: -1;
          top: 0;
          left: 0;
          right: 0;
          overflow: hidden;
          pointer-events: none;
          background: #f7f9fc;
        }

        /* hero: the band is the composition, and runs most of the first screen.
           page: the band is a signature, not a stage — it announces the surface
           and gets out of the way before any table or form reaches it. */
        .sky[data-variant="hero"] {
          height: clamp(820px, 108vh, 1320px);
          -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
        }
        .sky[data-variant="page"] {
          height: clamp(300px, 42vh, 460px);
          -webkit-mask-image: linear-gradient(to bottom, #000 34%, transparent 100%);
          mask-image: linear-gradient(to bottom, #000 34%, transparent 100%);
        }

        .sky__photo {
          position: absolute;
          inset: 0;
          background: url("/hero-sky.jpg") center / cover no-repeat;
          opacity: 0.85;
        }

        .sky__blobs { position: absolute; top: 0; left: 0; }

        /* The block's wash is opaque at its top stop, which erased the clouds in
           exactly the band where they read best. Same hues, carried as alpha. */
        .sky__wash {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 600px;
          background: linear-gradient(
            to bottom,
            rgba(239, 246, 255, 0.82),
            rgba(219, 234, 254, 0.4),
            transparent
          );
        }

        /* A legibility scrim, not a decoration. */
        .sky__veil {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 68% 54% at 50% 40%,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 0.72) 46%,
            rgba(255, 255, 255, 0) 78%
          );
        }
        /* The page band is shallow, so its veil is a vertical wash instead —
           an ellipse in a 300px strip would darken the corners the header and
           the sidebar sit in. */
        .sky[data-variant="page"] .sky__veil {
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.62),
            rgba(255, 255, 255, 0.8) 62%,
            rgba(255, 255, 255, 0.92)
          );
        }

        @media (prefers-reduced-motion: no-preference) {
          .sky { will-change: auto; }
        }
      `}</style>
    </div>
  );
}
