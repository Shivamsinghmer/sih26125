import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth-actions";
import { ROLE_HOME } from "@/lib/auth-types";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-[440px] flex-col justify-center px-6 py-16">
      <Link href="/" className="text-caption leading-caption text-slate-gray hover:text-ink-black">
        ← BEL Asset Custody
      </Link>

      <h1 className="display-serif mt-8 text-heading leading-heading tracking-heading">
        Sign in
      </h1>
      <p className="mt-3 text-body leading-body text-slate-gray">
        Access to this console is separate from what the chain permits. Signing in
        decides which screens you can open; the contracts still decide what can
        actually happen.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <div className="mt-10 rounded-2xl bg-mist-gray px-5 py-4">
        <p className="text-caption leading-caption text-slate-gray">
          Demo accounts — published deliberately, since this is a demo build and
          hiding them would only make the next person guess.
        </p>
        <ul className="mono-addr mt-2 flex flex-col gap-1 text-slate-gray">
          <li>admin / admin123 — issue, revoke, mint, onboard</li>
          <li>guard / guard123 — gate check only</li>
          <li>auditor / auditor123 — audit replay only</li>
        </ul>
      </div>
    </main>
  );
}
