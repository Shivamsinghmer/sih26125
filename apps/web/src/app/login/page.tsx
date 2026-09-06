import Link from "next/link";
import { redirect } from "next/navigation";

import { KeySignIn } from "@/components/KeySignIn";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth-actions";
import { ROLE_HOME } from "@/lib/auth-types";
import { accountFor } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);

  // The demo identities are derived from Hardhat's published mnemonic, so
  // surfacing the issuing authority's key here reveals nothing that is not
  // already public. It exists so the key-based path can be demonstrated without
  // a smartcard. A real deployment never prints a key on a web page.
  const demoAdminKey =
    process.env.NODE_ENV === "production"
      ? null
      : (() => {
          const hd = accountFor({ addressIndex: 0 }).getHdKey().privateKey;
          return hd ? `0x${Buffer.from(hd).toString("hex")}` : null;
        })();

  return (
    <main className="mx-auto max-w-[860px] px-6 py-16">
      <Link href="/" className="text-caption leading-caption text-slate-gray hover:text-ink-black">
        ← BEL Asset Custody
      </Link>

      <h1 className="display-serif mt-8 text-heading leading-heading tracking-heading">
        Sign in
      </h1>
      <p className="mt-3 max-w-[64ch] text-body leading-body text-slate-gray">
        Signing in decides which screens you can open. It never decides what the
        chain permits — every state change is still checked by the contracts.
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <section>
          <h2 className="text-subheading leading-subheading">People</h2>
          <p className="mt-2 text-caption leading-caption text-slate-gray">
            Prove you hold your key. Your role is then read from the chain, so a
            revoked credential closes the console too — there is no second place
            to update.
          </p>
          <div className="mt-6">
            <KeySignIn />
          </div>

          {demoAdminKey ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-caption leading-caption text-smoke-gray">
                Demo key for the issuing authority
              </summary>
              <p className="mt-2 text-caption leading-caption text-smoke-gray">
                Derived from Hardhat&rsquo;s published development mnemonic, so it
                is already public and worthless off this chain. Paste it above
                with any passphrase of 8 characters or more.
              </p>
              <p className="mono-addr mt-2 break-all text-slate-gray">{demoAdminKey}</p>
            </details>
          ) : null}
        </section>

        <section className="md:border-l md:border-mist-gray md:pl-12">
          <h2 className="text-subheading leading-subheading">Gate terminal</h2>
          <p className="mt-2 text-caption leading-caption text-slate-gray">
            A gate post is a device, staffed by whoever is on shift. The terminal
            is provisioned with its own credential — the way a card reader is
            today — rather than issuing every guard a personal key to unlock a
            shared screen.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="mt-6 rounded-2xl bg-mist-gray px-5 py-4">
            <p className="text-caption leading-caption text-slate-gray">
              Demo terminal
            </p>
            <p className="mono-addr mt-1 text-slate-gray">gate-3 / gate-post-3</p>
          </div>
        </section>
      </div>
    </main>
  );
}
