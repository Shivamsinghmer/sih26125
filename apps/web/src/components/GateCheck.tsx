"use client";

import { useActionState } from "react";

import { gateCheckAction } from "@/lib/gate-actions";
import { GATE_IDLE } from "@/lib/gate-types";
import { PillButton } from "./ui";

function formatExpiry(unix: number): string {
  if (!unix) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(unix * 1000));
}

export function GateCheck({ presets }: { presets: { label: string; did: string }[] }) {
  const [state, formAction, pending] = useActionState(gateCheckAction, GATE_IDLE);

  const result = state.status === "found" ? state.result : null;
  const validRoles = result?.holdings.filter((h) => h.validity === "valid") ?? [];
  const clear = Boolean(result?.registered && validRoles.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[320px] flex-1 flex-col gap-2">
          <span className="text-caption leading-caption text-slate-gray">
            Scan the card&rsquo;s QR, or paste a DID / address
          </span>
          <input
            name="identifier"
            autoFocus
            placeholder="did:ethr:0x7a69:0x…"
            className="mono-addr rounded-2xl border border-mist-gray bg-paper-white px-4 py-3"
          />
        </label>
        <PillButton type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check credential"}
        </PillButton>
      </form>

      {presets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption leading-caption text-smoke-gray">
            No scanner to hand? Try:
          </span>
          {presets.map((p) => (
            <form key={p.did} action={formAction}>
              <input type="hidden" name="identifier" value={p.did} />
              <button
                type="submit"
                className="rounded-full border border-mist-gray px-3 py-1.5 text-caption leading-caption text-slate-gray hover:border-ink-black hover:text-ink-black"
              >
                {p.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-3xl border border-mist-gray bg-fog-white px-8 py-6">
          <p className="text-body leading-body">{state.message}</p>
        </div>
      ) : null}

      {result ? (
        <div
          className={`rounded-3xl px-8 py-7 ${
            clear ? "bg-mist-gray" : "bg-blush-peach text-sienna-brown"
          }`}
          style={{ boxShadow: "var(--shadow-subtle)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              {result.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.photo}
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-paper-white text-heading-sm text-smoke-gray">
                  ?
                </div>
              )}
              <div>
                <h3 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
                  {clear ? "Credential valid" : "Do not admit"}
                </h3>
                <p className="mt-1 text-body leading-body">
                  {result.name ?? "Not in this console's records"}
                  {result.registered ? "" : " · identity not registered on chain"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-caption leading-caption opacity-70">Identity status</p>
              <p className="text-body-lg leading-body-lg">{result.statusLabel}</p>
            </div>
          </div>

          <p className="mt-5 text-caption leading-caption opacity-70">
            Compare the face to the photo printed on the card. This screen proves
            the credential, never the person.
          </p>

          <div className="mt-6 border-t border-current/15 pt-5">
            <p className="text-caption leading-caption opacity-70">Credentials</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.holdings.map((h) => (
                <span
                  key={h.label}
                  className={`rounded-full px-3 py-1 text-[13px] ${
                    h.validity === "valid"
                      ? "bg-ink-black text-paper-white"
                      : "border border-current/30 opacity-60"
                  }`}
                >
                  {h.label}
                  {h.validity === "valid"
                    ? ` · to ${formatExpiry(h.expiry)}`
                    : ` · ${h.validity.replace("-", " ")}`}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-current/15 pt-5">
            <p className="text-caption leading-caption opacity-70">Assets in their custody</p>
            {result.assets.length === 0 ? (
              <p className="mt-2 text-body leading-body">None.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {result.assets.map((a) => (
                  <li key={a.tokenId} className="text-body leading-body">
                    Asset #{a.tokenId} — requires {a.requiredRoleLabel} ·{" "}
                    {a.permitted ? "may carry" : "NOT permitted to carry"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mono-addr mt-6 opacity-60">
            {result.did} · checked at block {result.checkedAtBlock}
          </p>
        </div>
      ) : null}
    </div>
  );
}
