import Link from "next/link";
import { redirect } from "next/navigation";

import { KeySignIn } from "@/components/KeySignIn";
import { LoginForm } from "@/components/LoginForm";
import { SkyBackdrop } from "@/components/SkyBackdrop";
import { getSession } from "@/lib/auth-actions";
import { ROLE_HOME } from "@/lib/auth-types";
import { accountFor } from "@/lib/people";

export const dynamic = "force-dynamic";

/**
 * The threshold.
 *
 * This is the one screen that belongs to both registers: it is still the brand
 * surface a judge arrives on, and it is already the product. So it keeps the
 * landing page's sky and takes the console's discipline — the two ways in are
 * separated as two panels, because they are genuinely different mechanisms and
 * a visitor picking the wrong one is the failure this page has to prevent.
 *
 * The previous version set its secondary text in Steep's slate-gray and
 * smoke-gray, which measure 4.23:1 and 2.43:1 on white. Those are the tokens
 * the system specifies for links and tertiary labels, not for the sentences
 * that explain how to sign in.
 */
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
    <div className="signin">
      <SkyBackdrop variant="hero" />

      <main className="signin__inner">
        <header className="signin__head">
          <Link href="/" className="signin__back">
            ← BEL Asset Custody
          </Link>

          <h1 className="display-serif signin__title">Sign in</h1>
          <p className="signin__lede">
            Signing in decides which screens you can open. It never decides what
            the chain permits — every state change is still checked by the
            contracts.
          </p>
        </header>

        <div className="signin__ways">
          {/* A person proves possession of a key. */}
          <section className="signin__way">
            <div className="signin__way-head">
              <h2 className="signin__way-title">A person</h2>
              <p className="signin__way-sub">key held in this browser</p>
            </div>

            <p className="signin__way-body">
              Prove you hold your key. Your role is then read from the chain, so
              a revoked credential closes the console with it — there is no
              second place to update.
            </p>

            <div className="signin__form">
              <KeySignIn />
            </div>

            {demoAdminKey ? (
              <details className="signin__demo">
                <summary className="signin__demo-summary">
                  Demo key for the issuing authority
                </summary>
                <p className="signin__demo-body">
                  Derived from Hardhat&rsquo;s published development mnemonic, so
                  it is already public and worthless off this chain. Paste it
                  above with any passphrase of 8 characters or more.
                </p>
                <p className="mono-addr signin__demo-key">{demoAdminKey}</p>
              </details>
            ) : null}
          </section>

          {/* A post is provisioned as a device, not as whoever is on shift. */}
          <section className="signin__way">
            <div className="signin__way-head">
              <h2 className="signin__way-title">A gate post</h2>
              <p className="signin__way-sub">provisioned as a device</p>
            </div>

            <p className="signin__way-body">
              A gate post is staffed by whoever is on shift, so the terminal
              carries its own credential — the way a card reader does today —
              rather than issuing every guard a personal key to unlock a shared
              screen.
            </p>

            <div className="signin__form">
              <LoginForm />
            </div>

            <div className="signin__demo signin__demo--static">
              <p className="signin__demo-summary">Demo terminal</p>
              <p className="mono-addr signin__demo-key">gate-3 / gate-post-3</p>
            </div>
          </section>
        </div>

        <p className="signin__foot">
          Bharat Electronics Limited · Ministry of Defence · Problem statement
          SIH26125
        </p>
      </main>

      <style>{`
        .signin {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          min-height: 100svh;
        }

        .signin__inner {
          max-width: 1000px;
          margin: 0 auto;
          /* Height-aware. Sized only in vw, the page ran 107px past the fold
             on a 768-tall laptop — the one screen it most needs to fit on. */
          padding: clamp(12px, 2vh, 56px) clamp(20px, 5vw, 48px)
            clamp(20px, 3vh, 72px);
        }

        /* ------------------------------------------------------------- head */
        .signin__back {
          display: inline-block;
          font-size: 15px;
          /* 5.73:1. Steep's slate-gray is 4.23:1 and this sits on a sky. */
          color: #414755;
          transition: color 160ms ease-out;
        }
        .signin__back:hover { color: #17191c; }

        .signin__title {
          margin: clamp(12px, 2.4vh, 40px) 0 0;
          /* min() so a wide but short screen gets the size its height affords. */
          font-size: clamp(30px, min(5.4vw, 5.6vh), 62px);
          line-height: 1.06;
          letter-spacing: -0.028em;
          color: #17191c;
        }
        .signin__lede {
          margin: clamp(10px, 1.6vh, 14px) 0 0;
          max-width: 58ch;
          font-size: 17px;
          line-height: 1.55;
          text-wrap: pretty;
          color: #414755;
        }

        /* ------------------------------------------------------------- ways */
        .signin__ways {
          display: grid;
          gap: clamp(20px, 3vw, 28px);
          margin-top: clamp(16px, 2.6vh, 48px);
          align-items: start;
        }
        @media (min-width: 880px) {
          .signin__ways { grid-template-columns: 1fr 1fr; }
        }

        /* Two panels, because there are genuinely two mechanisms. They are the
           only cards on the page, so they read as choices rather than as the
           grid-of-identical-cards reflex. */
        .signin__way {
          min-width: 0;
          padding: clamp(22px, 3vw, 32px);
          border-radius: 24px;
          border: 1px solid #e7e7ea;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 24px 56px -24px rgba(23, 25, 28, 0.22);
        }

        .signin__way-head {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 6px 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f0f0f2;
        }
        .signin__way-title {
          margin: 0;
          font-family: var(--font-signifier);
          font-weight: 400;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.018em;
          color: #17191c;
        }
        .signin__way-sub {
          margin: 0;
          font-size: 12.5px;
          color: #616675;
        }

        .signin__way-body {
          margin: 16px 0 0;
          font-size: 14.5px;
          line-height: 1.6;
          text-wrap: pretty;
          color: #4f5461;
        }

        .signin__form { margin-top: 20px; }

        /* ------------------------------------------------------------- demo */
        .signin__demo {
          margin-top: 20px;
          padding: 14px 16px;
          border-radius: 16px;
          background: #f2f2f3;
        }
        .signin__demo--static { padding-bottom: 12px; }

        .signin__demo-summary {
          margin: 0;
          font-size: 13px;
          color: #414755;
        }
        details.signin__demo .signin__demo-summary { cursor: pointer; }
        details.signin__demo[open] .signin__demo-summary { margin-bottom: 8px; }

        .signin__demo-body {
          margin: 0 0 8px;
          font-size: 12.5px;
          line-height: 1.55;
          color: #4f5461;
        }
        .signin__demo-key {
          margin: 0;
          word-break: break-all;
          color: #17191c;
        }

        .signin__foot {
          margin: clamp(14px, 2.2vh, 56px) 0 0;
          font-size: 13px;
          color: #4a5060;
        }

        @media (max-height: 860px) and (min-width: 880px) {
          .signin__inner { padding-top: 14px; padding-bottom: 18px; }
          .signin__title { margin-top: 10px; }
          .signin__lede { margin-top: 8px; font-size: 16px; }
          .signin__ways { margin-top: 14px; }
          .signin__way { padding: 16px clamp(18px, 2.2vw, 32px) 18px; }
          .signin__way-head { padding-bottom: 11px; }
          .signin__way-body { margin-top: 11px; font-size: 14px; }
          .signin__form { margin-top: 13px; }
          .signin__demo { margin-top: 13px; padding: 11px 14px; }
          .signin__foot { margin-top: 12px; }
        }

        @media (max-width: 500px) {
          .signin__way-head { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
