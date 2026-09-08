import type { ConsoleRole } from "./auth-types";

/**
 * What the sidebar offers, per role.
 *
 * Grouped by what someone is trying to do rather than by which contract backs
 * it — "Hand over an item" is a task, `AssetToken._update` is an implementation
 * detail. Anything a role cannot open is never rendered: a link that redirects
 * on click teaches people the app is unreliable.
 *
 * Labels name the task in the words the person already uses. Nobody arrives at
 * a gate post wanting to "query credential validity"; they want to know whether
 * to let someone through. The precise machinery is still true and still
 * explained — on /help, where somebody who wants it can go and find it.
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
   * Only screens that genuinely have separate sections carry these. "Hand over
   * an item" is one form on one page and gets none: padding the rail out with
   * plausible-looking links that go nowhere teaches people to distrust it.
   */
  sections?: NavSection[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Offered to every role, because everyone is allowed to need instructions. */
const HELP_GROUP: NavGroup = {
  title: "Help",
  items: [
    {
      href: "/help",
      label: "How to use this",
      description: "Step-by-step guide, diagrams and examples",
    },
  ],
};

const ADMIN_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/console", label: "Dashboard", description: "Where everything stands right now" },
    ],
  },
  {
    title: "People",
    items: [
      {
        href: "/console/people",
        label: "People",
        description: "Add people, see what they are cleared for, print ID cards",
        sections: [
          { href: "/console/people#onboard", label: "Add someone" },
          { href: "/console/people#reset", label: "Load the example data" },
        ],
      },
      {
        href: "/console/credentials",
        label: "Clearances",
        description: "Give someone a clearance, or take one away",
        sections: [
          { href: "/console/credentials#issue", label: "Give a clearance" },
          { href: "/console/credentials#revoke", label: "Take one away" },
        ],
      },
    ],
  },
  {
    title: "Equipment",
    items: [
      {
        href: "/console/assets",
        label: "Equipment",
        description: "Add equipment and see who is holding it",
        sections: [{ href: "/console/assets#register", label: "Add equipment" }],
      },
      {
        href: "/console/transfers",
        label: "Hand over an item",
        description: "Pass equipment to someone else",
      },
    ],
  },
  {
    title: "Checks",
    items: [
      { href: "/gate", label: "Gate check", description: "Scan a card and check it on the spot" },
      { href: "/audit", label: "History", description: "Everything that has happened, in order" },
    ],
  },
  HELP_GROUP,
];

const GUARD_GROUPS: NavGroup[] = [
  {
    title: "Gate post",
    items: [
      { href: "/gate", label: "Gate check", description: "Scan a card and check it on the spot" },
    ],
  },
  HELP_GROUP,
];

const AUDITOR_GROUPS: NavGroup[] = [
  {
    title: "Audit",
    items: [
      { href: "/audit", label: "History", description: "Everything that has happened, in order" },
    ],
  },
  HELP_GROUP,
];

export function navFor(role: ConsoleRole): NavGroup[] {
  if (role === "admin") return ADMIN_GROUPS;
  if (role === "guard") return GUARD_GROUPS;
  return AUDITOR_GROUPS;
}
