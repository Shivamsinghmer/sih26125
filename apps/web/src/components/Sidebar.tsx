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
 * state on every item, and a footer carrying who is signed in. Rebuilt in Steep
 * rather than installed — the block sits on shadcn's sidebar primitive plus
 * seven more of its components, and `shadcn init` rewrites globals.css, which
 * is where this project's design system lives.
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
 */

const COLLAPSE_KEY = "sih26125.sidebar.collapsed";

export function Sidebar({
  groups,
  who,
  roleLabel,
  chainNote,
}: {
  groups: NavGroup[];
  who: string;
  roleLabel: string;
  chainNote?: string;
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
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
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
      className="rail flex w-full shrink-0 flex-col gap-6 border-b border-mist-gray px-6 py-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r"
    >
      <div className="rail__top">
        <Link href="/" className="rail__mark">
          <span className="text-caption leading-caption text-ink-black">BEL Asset Custody</span>
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
        <input
          id="nav-search"
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search screens…"
          className="w-full rounded-2xl border border-mist-gray bg-paper-white px-3 py-2 text-caption leading-caption text-ink-black placeholder:text-label focus:border-ink-black focus:outline-none"
        />
      </div>

      <nav className="flex flex-1 flex-col gap-6">
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
        <div className="rail__who">
          <p className="text-caption leading-caption text-ink-black">{who}</p>
          <p className="text-caption leading-caption text-label">{roleLabel}</p>
        </div>

        {/* Collapsed, the initial stands in for the name — and carries the full
            name as its accessible label rather than losing it. */}
        <span
          aria-label={`${who}, ${roleLabel}`}
          title={`${who} · ${roleLabel}`}
          className="rail__initial"
        >
          {who.trim().charAt(0)}
        </span>

        {chainNote ? <p className="mono-addr rail__chain">{chainNote}</p> : null}
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

        .rail__group-title {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #616675;
        }

        .rail__link {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 16px;
          padding: 8px 12px;
          font-size: 17px;
          line-height: 1.35;
          color: #414755;
          transition: background-color 160ms ease-out, color 160ms ease-out;
        }
        .rail__link:hover { background: #f2f2f3; color: #17191c; }
        .rail__link--active { background: #17191c; color: #fff; }
        .rail__link--active:hover { background: #17191c; color: #fff; }

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
          padding: 0 0 0 40px;
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
          padding: 5px 10px;
          border-radius: 10px;
          font-size: 13.5px;
          line-height: 1.4;
          color: #4f5461;
          transition: background-color 140ms ease-out, color 140ms ease-out;
        }
        .rail__section:hover { background: #f2f2f3; color: #17191c; }

        .rail__foot {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #f2f2f3;
          padding-top: 20px;
        }
        .rail__initial {
          display: none;
          height: 32px;
          width: 32px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #17191c;
          color: #fff;
          font-size: 15px;
        }
        .rail__chain { color: #616675; }

        /* ---------------------------------------------------------- collapse */
        /* Driven here, and with min-width pinned to 0: a flex item's automatic
           minimum size is its min-content width, so without this the rail
           refuses to go below the width of its own longest label — which is
           exactly what it did, sitting at 264px however narrow it was told to
           be. */
        .rail { transition: flex-basis 200ms cubic-bezier(0.22, 1, 0.36, 1),
            max-width 200ms cubic-bezier(0.22, 1, 0.36, 1),
            width 200ms cubic-bezier(0.22, 1, 0.36, 1); }

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
          .rail[data-collapsed="true"] .rail__who,
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
          .rail[data-collapsed="true"] .rail__initial { display: flex; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rail, .rail__sections { transition: none; }
        }
      `}</style>
    </aside>
  );
}
