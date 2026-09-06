"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { privateKeyToAccount } from "viem/accounts";

import { ROLE_HOME } from "@/lib/auth-types";
import { enrolKey, forgetKeystore, readKeystore, unlockKey, type StoredKeystore } from "@/lib/keystore";
import { requestNonce, verifySignIn } from "@/lib/siwe-actions";
import { SIWE_IDLE, type SiweState } from "@/lib/siwe-types";
import { PillButton } from "./ui";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Sign in by proving possession of a key this browser holds.
 *
 * The passphrase never leaves the page — it only decrypts the key locally. What
 * reaches the server is a signature over a challenge it issued, which it checks
 * against the chain.
 */
export function KeySignIn() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredKeystore | null>(null);
  const [mode, setMode] = useState<"unlock" | "enrol">("unlock");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<SiweState>(SIWE_IDLE);

  useEffect(() => {
    const existing = readKeystore();
    setStored(existing);
    setMode(existing ? "unlock" : "enrol");
  }, []);

  async function signInWith(privateKey: string) {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const { nonce, domain, issuedAt } = await requestNonce();

    // Built client-side and rebuilt server-side from the same fields, so a
    // signature over anything else will not verify.
    const message = [
      `${domain} wants you to sign in with your BEL identity.`,
      "",
      `Address: ${account.address}`,
      "",
      "This proves you hold the key behind this identity. Your role is then read",
      "from the chain — signing in grants no permission the chain does not already",
      "record for this address.",
      "",
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
    ].join("\n");

    const signature = await account.signMessage({ message });

    const form = new FormData();
    form.set("address", account.address);
    form.set("signature", signature);
    form.set("nonce", nonce);
    form.set("issuedAt", issuedAt);
    form.set("domain", domain);

    const result = await verifySignIn(SIWE_IDLE, form);
    setState(result);
    if (result.status === "ok") router.push(ROLE_HOME[result.role]);
  }

  async function onUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passphrase = new FormData(event.currentTarget).get("passphrase") as string;
    setBusy(true);
    setState(SIWE_IDLE);
    try {
      const key = await unlockKey(passphrase);
      if (!key) {
        setState({ status: "error", message: "That passphrase does not unlock this key." });
        return;
      }
      await signInWith(key);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Sign-in failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onEnrol(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const privateKey = String(data.get("privateKey") ?? "").trim();
    const passphrase = String(data.get("passphrase") ?? "");

    setBusy(true);
    setState(SIWE_IDLE);
    try {
      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        setState({ status: "error", message: "That is not a 32-byte private key." });
        return;
      }
      if (passphrase.length < 8) {
        setState({ status: "error", message: "Use a passphrase of at least 8 characters." });
        return;
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const saved = await enrolKey(privateKey, passphrase, account.address);
      setStored(saved);
      setMode("unlock");
      await signInWith(privateKey);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not store that key.",
      });
    } finally {
      setBusy(false);
    }
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <div className="flex flex-col gap-5">
      {mode === "unlock" && stored ? (
        <form onSubmit={onUnlock} className="flex flex-col gap-4">
          <div className="rounded-2xl bg-mist-gray px-5 py-4">
            <p className="text-caption leading-caption text-slate-gray">Key held in this browser</p>
            <p className="mono-addr mt-1">{shorten(stored.address)}</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-caption leading-caption text-slate-gray">Passphrase</span>
            <input
              name="passphrase"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
            />
          </label>

          {error ? (
            <p role="alert" className="text-caption leading-caption text-sienna-brown">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <PillButton type="submit" disabled={busy}>
              {busy ? "Signing…" : "Unlock and sign in"}
            </PillButton>
            <button
              type="button"
              onClick={() => {
                forgetKeystore();
                setStored(null);
                setMode("enrol");
                setState(SIWE_IDLE);
              }}
              className="text-caption leading-caption text-slate-gray underline underline-offset-2 hover:text-ink-black"
            >
              Use a different key
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onEnrol} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-caption leading-caption text-slate-gray">
              Private key
            </span>
            <input
              name="privateKey"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              required
              className="mono-addr rounded-2xl border border-mist-gray bg-paper-white px-4 py-3"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-caption leading-caption text-slate-gray">
              Passphrase to encrypt it in this browser
            </span>
            <input
              name="passphrase"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
            />
          </label>

          {error ? (
            <p role="alert" className="text-caption leading-caption text-sienna-brown">
              {error}
            </p>
          ) : null}

          <div>
            <PillButton type="submit" disabled={busy}>
              {busy ? "Storing…" : "Store key and sign in"}
            </PillButton>
          </div>

          <p className="text-caption leading-caption text-smoke-gray">
            The key is encrypted with your passphrase and kept in this browser
            only. Neither ever reaches the server — it sees a signature, and
            reads your role from the chain.
          </p>
        </form>
      )}
    </div>
  );
}
