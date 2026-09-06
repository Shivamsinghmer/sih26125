"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavGroup } from "@/lib/nav";

/**
 * The dashboard's spine.
 *
 * Active state is matched exactly rather than by prefix, or /console would
 * light up while you are on /console/people — the one place the highlight has
 * to be right is the place it would otherwise be wrong on every child route.
 */
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

  return (
    <aside className="flex w-full shrink-0 flex-col gap-8 border-b border-mist-gray px-6 py-8 md:h-screen md:w-[264px] md:overflow-y-auto md:border-b-0 md:border-r md:px-7">
      <div>
        <Link href="/" className="block">
          <p className="text-caption leading-caption text-ink-black">BEL Asset Custody</p>
          <p className="text-caption leading-caption text-ash-gray">SIH26125</p>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-7">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[11px] uppercase tracking-[0.08em] text-smoke-gray">
              {group.title}
            </p>
            <ul className="mt-3 flex flex-col gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-2xl px-3 py-2 text-body leading-body transition-colors ${
                        active
                          ? "bg-ink-black text-paper-white"
                          : "text-slate-gray hover:bg-mist-gray hover:text-ink-black"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-mist-gray pt-5">
        <div>
          <p className="text-caption leading-caption text-ink-black">{who}</p>
          <p className="text-caption leading-caption text-slate-gray">{roleLabel}</p>
        </div>
        {chainNote ? <p className="mono-addr text-smoke-gray">{chainNote}</p> : null}
      </div>
    </aside>
  );
}
