import Link from "next/link";

import { getSession } from "@/lib/auth-actions";
import { ROLE_ACCESS, ROLE_LABEL } from "@/lib/auth-types";
import { SignOutButton } from "./SignOutButton";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/console", label: "Console" },
  { href: "/gate", label: "Gate check" },
  { href: "/audit", label: "Audit" },
];

/**
 * The signed-in bar. Only shows the surfaces the current role may actually
 * reach — a link that redirects on click teaches people the app is unreliable.
 */
export async function AppHeader({ chainNote }: { chainNote?: string }) {
  const session = await getSession();
  if (!session) return null;

  const allowed = NAV.filter((item) => ROLE_ACCESS[session.role].includes(item.href));

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-mist-gray pb-5">
      <div className="flex flex-wrap items-baseline gap-5">
        <Link href="/" className="text-caption leading-caption">
          <span className="text-ink-black">BEL Asset Custody</span>
          <span className="text-ash-gray"> · SIH26125</span>
        </Link>
        <nav className="flex gap-4">
          {allowed.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-caption leading-caption text-slate-gray hover:text-ink-black"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {chainNote ? <span className="mono-addr text-smoke-gray">{chainNote}</span> : null}
        <span className="text-caption leading-caption text-slate-gray">
          {session.displayName} · {ROLE_LABEL[session.role]}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
