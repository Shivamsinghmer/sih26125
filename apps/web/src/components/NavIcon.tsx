/**
 * Nav icons, drawn rather than installed.
 *
 * The app-shell-5 block puts an icon beside every nav item, which is what makes
 * its rail legible once the sidebar collapses to icons only. It reaches for an
 * icon library to do it; seven glyphs is not worth a dependency, and a stroked
 * 16px set in the system's own weight sits better beside Steep's type than a
 * general-purpose library would.
 *
 * Each one depicts the object the screen is about — a card, a badge, a crate, a
 * gate — rather than a generic abstraction, because on a collapsed rail the
 * glyph is the only label left.
 */

export type NavIconName =
  | "dashboard"
  | "people"
  | "credentials"
  | "assets"
  | "transfer"
  | "gate"
  | "audit"
  | "help";

const PATHS: Record<NavIconName, React.ReactNode> = {
  // A pane split into panels — the console's own layout.
  dashboard: (
    <>
      <rect x="2.5" y="2.5" width="5" height="5" rx="1.2" />
      <rect x="10.5" y="2.5" width="5" height="5" rx="1.2" />
      <rect x="2.5" y="10.5" width="5" height="5" rx="1.2" />
      <rect x="10.5" y="10.5" width="5" height="5" rx="1.2" />
    </>
  ),
  // A person on a card.
  people: (
    <>
      <circle cx="9" cy="6" r="2.6" />
      <path d="M3.6 15c.6-2.7 2.8-4.2 5.4-4.2s4.8 1.5 5.4 4.2" />
    </>
  ),
  // A credential: a card with a seal.
  credentials: (
    <>
      <rect x="2.2" y="4" width="13.6" height="10" rx="2" />
      <circle cx="6.4" cy="9" r="1.8" />
      <path d="M10.4 7.6h3.2M10.4 10.4h3.2" />
    </>
  ),
  // A crate.
  assets: (
    <>
      <path d="M9 2.4 15.6 6v6L9 15.6 2.4 12V6z" />
      <path d="M2.4 6 9 9.5 15.6 6M9 9.5v6.1" />
    </>
  ),
  // Custody moving from one holder to another.
  transfer: (
    <>
      <path d="M2.6 6.6h9.2M9.4 4l2.6 2.6L9.4 9.2" />
      <path d="M15.4 11.4H6.2M8.6 8.8 6 11.4l2.6 2.6" />
    </>
  ),
  // A barrier across a way.
  gate: (
    <>
      <path d="M3.2 15V4.2M3.2 5.6h11.6v3.2H3.2" />
      <path d="M14.8 15V8.8" />
    </>
  ),
  // A question inside a ring — the one glyph here that depicts asking rather
  // than a thing, because that is what the screen is for.
  help: (
    <>
      <circle cx="9" cy="9" r="6.6" />
      <path d="M7.2 7.1a1.85 1.85 0 1 1 2.5 1.74c-.5.2-.7.6-.7 1.06v.4" />
      <path d="M9 12.7h.01" />
    </>
  ),
  // A record with a replayed line.
  audit: (
    <>
      <path d="M4 2.6h7.2L14.6 6v9.4H4z" />
      <path d="M10.8 2.6V6h3.8" />
      <path d="M6.6 9.4h5.2M6.6 12h3.4" />
    </>
  ),
};

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      viewBox="0 0 18 18"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Maps a route to its glyph. Kept here so nav.ts stays free of presentation. */
export function iconForHref(href: string): NavIconName {
  if (href === "/console") return "dashboard";
  if (href.startsWith("/console/people")) return "people";
  if (href.startsWith("/console/credentials")) return "credentials";
  if (href.startsWith("/console/assets")) return "assets";
  if (href.startsWith("/console/transfers")) return "transfer";
  if (href.startsWith("/gate")) return "gate";
  if (href.startsWith("/help")) return "help";
  return "audit";
}
