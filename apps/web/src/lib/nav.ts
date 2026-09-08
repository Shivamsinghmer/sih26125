import type { ConsoleRole } from "./auth-types";

/**
 * What the sidebar offers, per role.
 *
 * Grouped by what someone is trying to do rather than by which contract backs
 * it — "Move an asset" is a task, `AssetToken._update` is an implementation
 * detail. Anything a role cannot open is never rendered: a link that redirects
 * on click teaches people the app is unreliable.
 */
export interface NavSection {
  /** A real anchor on the item's page — never a link to something invented. */
  href: string;
  label: string;
}

export interface NavItem {
  href: string;
  label: string;
  description: string;
  /**
   * What you can actually do once you are there.
   *
   * Only screens that genuinely have separate sections carry these. "Move an
   * asset" is one form on one page and gets none: padding the rail out with
   * plausible-looking links that go nowhere teaches people to distrust it.
   */
  sections?: NavSection[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ADMIN_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/console", label: "Dashboard", description: "What the chain currently holds" },
    ],
  },
  {
    title: "Identity",
    items: [
      {
        href: "/console/people",
        label: "People",
        description: "Onboard, view credentials, print cards",
        sections: [
          { href: "/console/people#onboard", label: "Onboard someone new" },
          { href: "/console/people#reset", label: "Reset to the demo state" },
        ],
      },
      {
        href: "/console/credentials",
        label: "Credentials",
        description: "Issue and revoke roles",
        sections: [
          { href: "/console/credentials#issue", label: "Issue a credential" },
          { href: "/console/credentials#revoke", label: "Revoke a credential" },
        ],
      },
    ],
  },
  {
    title: "Custody",
    items: [
      {
        href: "/console/assets",
        label: "Assets",
        description: "Register and assign equipment",
        sections: [{ href: "/console/assets#register", label: "Register an asset" }],
      },
      { href: "/console/transfers", label: "Move an asset", description: "Transfer, gated by credential" },
    ],
  },
  {
    title: "Verification",
    items: [
      { href: "/gate", label: "Gate check", description: "Scan a card and check it live" },
      { href: "/audit", label: "Audit trail", description: "Replay every event from the chain" },
    ],
  },
];

const GUARD_GROUPS: NavGroup[] = [
  {
    title: "Gate post",
    items: [
      { href: "/gate", label: "Gate check", description: "Scan a card and check it live" },
    ],
  },
];

const AUDITOR_GROUPS: NavGroup[] = [
  {
    title: "Audit",
    items: [
      { href: "/audit", label: "Audit trail", description: "Replay every event from the chain" },
    ],
  },
];

export function navFor(role: ConsoleRole): NavGroup[] {
  if (role === "admin") return ADMIN_GROUPS;
  if (role === "guard") return GUARD_GROUPS;
  return AUDITOR_GROUPS;
}
