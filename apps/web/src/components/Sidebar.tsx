"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { NavIcon, iconForHref } from "./NavIcon";
import type { NavGroup } from "@/lib/nav";

/**
 * The dashboard's spine.
 *
 * Structure follows the @efferd/app-shell-5 block: a mark and a collapse
 * trigger in the header, a search field, grouped nav with an icon and an active
 * state on every item, and a footer carrying who is signed in. Kept hand-built
 * rather than swapped for shadcn's sidebar primitive now that shadcn is in the
 * project: the rail's collapse, cmd-K and sub-link behaviour are already tuned
 * here, and the primitive would bring a provider, a cookie and a mobile sheet
 * this console does not use.
 *
 * Two of its features were dropped rather than faked. Its theme switcher has
 * nothing to switch: this app ships one committed light theme. Its "latest
 * change" panel is a changelog feed that would have to be invented.
 *
 * Presentation lives in the scoped stylesheet below rather than in conditional
 * Tailwind classes. That is not a preference: `md:w-[76px]` was applied to the
 * rail and it still measured 264px, because the utility was never generated
 * from a class name assembled inside a template literal. Anything that changes
 * with the rail's state is therefore driven by `[data-collapsed]` in CSS, which
 * is inspectable and cannot silently fail to exist.
 *
 * Active state is matched exactly rather than by prefix, or /console would
 * light up while you are on /console/people — the one place the highlight has
 * to be right is the place it would otherwise be wrong on every child route.
 *
 * The rail is exactly one viewport tall and never scrolls as a whole: the
 * header, the search and the footer stay put, and the nav in the middle is the
 * only region that can move. Spacing is tuned so that on a 768px-tall laptop it
 * does not have to — but the structure holds at any height rather than trusting
 * that it fits, which is the difference between a layout and a hope.
 */

const COLLAPSE_KEY = "sih26125.sidebar.collapsed";

export function Sidebar({
  groups,
  who,
  roleLabel,
  chainNote,
  chainDetail,
  footerAction,
}: {
  groups: NavGroup[];
  who: string;
  roleLabel: string;
  /** Plain status, read at a glance: is this thing on. */
  chainNote?: string;
  /** The identifiers behind it, for whoever is diagnosing rather than working. */
  chainDetail?: string;
  /** Sign-out, kept with the identity it ends rather than alone in a header. */
  footerAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Read after mount, never during render: the server has no localStorage, and
  // seeding state from it directly is a hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Private windows and blocked storage throw on read. The rail simply
      // starts expanded, which is the state that needs no explanation.
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* Not worth failing the interaction over. */
      }
      return next;
    });
  }

  // The block binds its search to a keypress hook. One shortcut does not need
  // one: cmd/ctrl-K focuses the field, and expands the rail first if it is
  // collapsed, since there would otherwise be nothing to type into.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // `key` is optional on KeyboardEvent in practice: events synthesised by
      // autofill, password managers and some IMEs arrive without one, and
      // reading `.toLowerCase()` off it throws on a keystroke that had nothing
      // to do with this shortcut.
      if (e.key?.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setCollapsed(false);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            (i.sections ?? []).some((s) => s.label.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const noMatches = query.trim().length > 0 && filtered.length === 0;

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className="rail flex w-full shrink-0 flex-col gap-5 border-b border-sidebar-border bg-sidebar px-6 py-5 md:sticky md:top-0 md:h-screen md:overflow-hidden md:border-b-0 md:border-r"
    >
      <div className="rail__top">
        <Link href="/" className="rail__mark">
          <span className="text-caption leading-caption text-ink-black">CredLock</span>
          <span className="text-caption leading-caption text-label">SIH26125</span>
        </Link>

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rail__toggle"
        >
          <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.4" y="3" width="13.2" height="12" rx="2" />
            <path d="M7.2 3v12" />
          </svg>
        </button>
      </div>

      {/* Hidden rather than unmounted when collapsed, so the cmd-K handler can
          expand the rail and focus the same input without a remount race. */}
      <div className="rail__search">
        <label className="sr-only" htmlFor="nav-search">
          Filter navigation
        </label>
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 18 18"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-label"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="4.75" />
            <path d="m11.6 11.6 3.4 3.4" />
          </svg>
          <input
            id="nav-search"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens"
            className="h-10 w-full rounded-full border border-sidebar-border bg-paper-white pr-14 pl-9 text-caption text-ink-black transition-[border-color] duration-150 placeholder:text-label hover:border-[#d5d6da] focus-visible:border-ink-black focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {/* The shortcut the handler above listens for, shown where it acts. */}
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md border border-sidebar-border bg-fog-white px-1.5 py-0.5 font-sans text-[11px] leading-none text-label">
            Ctrl K
          </kbd>
        </div>
      </div>

      <nav className="rail__nav flex min-h-0 flex-1 flex-col gap-4">
        {filtered.map((group) => (
          <div key={group.title}>
            <p className="rail__group-title">{group.title}</p>

            <ul className="mt-2 flex flex-col gap-1">
              {group.items.map((item) => {
                // Exact for the item itself; the sub-links open whenever you are
                // anywhere on that screen, so arriving by any route leaves the
                // actions in reach rather than requiring a hover to find them.
                const active = pathname === item.href;
                const onScreen = pathname === item.href.split("#")[0];
                const sections = item.sections ?? [];

                return (
                  <li
                    key={item.href}
                    className="rail__item"
                    data-open={onScreen && sections.length > 0 ? "true" : undefined}
                  >
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      className={`rail__link ${active ? "rail__link--active" : ""}`}
                    >
                      <NavIcon name={iconForHref(item.href)} />
                      <span className="rail__label">{item.label}</span>
                    </Link>

                    {sections.length > 0 ? (
                      <div className="rail__sections">
                        <ul className="rail__sections-inner">
                          {sections.map((s) => (
                            <li key={s.href}>
                              <Link href={s.href} className="rail__section">
                                {s.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {noMatches ? (
          <p className="text-caption leading-caption text-label">
            No screen matches &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : null}
      </nav>

      <div className="rail__foot">
        <div className="rail__who flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-black text-caption text-paper-white"
          >
            {who.trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption leading-tight text-ink-black">{who}</p>
            <p className="truncate text-[13px] leading-tight text-label">{roleLabel}</p>
          </div>
          {footerAction}
        </div>


        {chainNote ? (
          <p className="rail__chain" title={chainDetail}>
            {/* A lit or unlit dot, so "is this thing on" is answered before the
                sentence is read. Ink when connected; a hollow ring when not. */}
            <span aria-hidden className="rail__chain-dot" data-on={chainDetail ? "true" : "false"} />
            {chainNote}
          </p>
        ) : null}
      </div>

      <style>{`
        .rail__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .rail__mark { display: flex; flex-direction: column; min-width: 0; }

        .rail__toggle {
          display: none;
          flex: none;
          border-radius: 12px;
          padding: 8px;
          color: #616675;
          transition: background-color 160ms ease-out, color 160ms ease-out;
        }
        .rail__toggle:hover { background: #f2f2f3; color: #17191c; }
        @media (min-width: 768px) { .rail__toggle { display: block; } }

        /* The one region allowed to move, and only when a short viewport
           leaves it no choice. overflow-y:auto rather than scroll so no track
           is painted in the ordinary case where everything already fits. */
        .rail__nav {
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: #d7d8dc transparent;
        }
        .rail__nav::-webkit-scrollbar { width: 6px; }
        .rail__nav::-webkit-scrollbar-thumb {
          background: #d7d8dc;
          border-radius: 999px;
        }
        .rail__nav::-webkit-scrollbar-track { background: transparent; }

        .rail__group-title {
          padding: 0 11px;
          font-size: 12px;
          font-weight: 480;
          color: #616675;
        }

        /* 15.5px and 6px of padding, down from 17px and 8px. The rail carries
           five groups now that Help is one of them; at the old rhythm the
           footer fell below the fold on a 768px-tall laptop, which is the
           height most of these machines actually have. Still a 32px row, so
           the pointer target is unharmed. */
        .rail__link {
          display: flex;
          align-items: center;
          gap: 11px;
          border-radius: 14px;
          padding: 6px 11px;
          font-size: 15.5px;
          line-height: 1.3;
          color: #414755;
          transition: background-color 160ms ease-out, color 160ms ease-out;
        }
        .rail__link:hover { background: #f0f0f2; color: #17191c; }
        /* Active is a raised white tab on the fog layer, not a solid ink bar:
           ink is the primary *action* colour, and a nav item is not an action.
           The hairline and the lift say "you are here" without competing with
           the one filled button on the page. */
        .rail__link--active,
        .rail__link--active:hover {
          background: #fff;
          color: #17191c;
          box-shadow: 0 0 0 1px rgba(23, 25, 28, 0.07), 0 1px 3px rgba(23, 25, 28, 0.06);
        }

        /* ---------------------------------------------------------- sections */
        /* What you can do once you are there, revealed on hover, on keyboard
           focus, and whenever the screen is already open. Height is animated
           from a measured 0 rather than toggled on display, so it moves; and
           the list is inert until it opens, so a collapsed item's links are
           never a tab stop the reader cannot see. */
        /* One grid track wrapping the whole list, not one per item. With
           grid-template-rows: 0fr on the list itself, only the first link
           collapsed — the rest landed in implicit auto rows and the closed
           state still occupied 29px of the rail. */
        .rail__sections {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows 200ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 160ms ease-out;
        }
        .rail__sections-inner {
          list-style: none;
          margin: 0;
          padding: 0 0 0 38px;
          overflow: hidden;
          min-height: 0;
        }

        .rail__item:hover .rail__sections,
        .rail__item:focus-within .rail__sections,
        .rail__item[data-open="true"] .rail__sections {
          grid-template-rows: 1fr;
          opacity: 1;
        }

        .rail__section {
          display: block;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.4;
          color: #4f5461;
          transition: background-color 140ms ease-out, color 140ms ease-out;
        }
        .rail__section:hover { background: #f2f2f3; color: #17191c; }

        /* Pinned by the nav taking the remaining height, not by a margin —
           so it sits on the bottom edge whether the nav overflows or not. */
        .rail__foot {
          display: flex;
          flex-direction: column;
          gap: 8px;
          gap: 12px;
          border-top: 1px solid #e7e7ea;
          padding-top: 16px;
        }
        .rail__chain {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #616675;
          font-size: 12.5px;
          line-height: 1.35;
        }
        .rail__chain-dot {
          width: 7px;
          height: 7px;
          flex: none;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1.5px #616675;
        }
        .rail__chain-dot[data-on="true"] {
          background: #17191c;
          box-shadow: 0 0 0 3px rgba(23, 25, 28, 0.08);
        }

        /* ---------------------------------------------------------- collapse */
        /* Driven here, and with min-width pinned to 0: a flex item's automatic
           minimum size is its min-content width, so without this the rail
           refuses to go below the width of its own longest label — which is
           exactly what it did, sitting at 264px however narrow it was told to
           be. */
        /* A pane over the sky, not a hole in it.
           The console backdrop carries the photograph across the whole first
           screen now, and a column of 15px nav labels sitting directly on
           clouds is exactly the legibility gamble SkyBackdrop's own notes warn
           against. Near-paper, so the sky reads through the edges and the text
           does not have to compete; the blur is a progressive enhancement and
           the alpha alone is sufficient without it. */
        /* The second neutral layer, one step off the paper canvas. It used to be
           frosted glass over a sky photograph; the console dropped the sky, and
           a blur over flat white is decoration pretending to be depth. */
        .rail {
          transition: flex-basis 200ms cubic-bezier(0.22, 1, 0.36, 1),
            max-width 200ms cubic-bezier(0.22, 1, 0.36, 1),
            width 200ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        @media (min-width: 768px) {
          /* flex-basis and max-width, not width alone. width was applied and
             ignored: a flex item's used size comes from its basis, and its
             automatic minimum size is its min-content width — so a rail told to
             be 76px sat at 264px, the width of its own longest label. Pinning
             the basis and capping the box settles it in both directions. */
          .rail {
            flex: 0 0 264px;
            width: 264px;
            min-width: 0;
            max-width: 264px;
            padding-left: 28px;
            padding-right: 28px;
          }
          .rail[data-collapsed="true"] {
            flex: 0 0 76px;
            width: 76px;
            max-width: 76px;
            padding-left: 14px;
            padding-right: 14px;
            align-items: center;
          }
          .rail[data-collapsed="true"] .rail__mark,
          .rail[data-collapsed="true"] .rail__search,
          .rail[data-collapsed="true"] .rail__group-title,
          .rail[data-collapsed="true"] .rail__label,
          .rail[data-collapsed="true"] .rail__sections,
          .rail[data-collapsed="true"] .rail__who > div,
          .rail[data-collapsed="true"] .rail__chain {
            display: none;
          }
          .rail[data-collapsed="true"] .rail__top { justify-content: center; }
          .rail[data-collapsed="true"] nav { align-self: stretch; }
          .rail[data-collapsed="true"] .rail__link {
            justify-content: center;
            padding-left: 8px;
            padding-right: 8px;
          }
          .rail[data-collapsed="true"] .rail__foot { align-items: center; }
          /* Collapsed, the identity row stacks: the monogram stands in for the
             name, and sign-out stays reachable underneath it. */
          .rail[data-collapsed="true"] .rail__who { flex-direction: column; gap: 6px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rail, .rail__sections { transition: none; }
        }
      `}</style>
    </aside>
  );
}
