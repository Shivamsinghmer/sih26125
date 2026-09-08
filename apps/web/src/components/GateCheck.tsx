"use client";

import { useActionState, useRef } from "react";

import { gateCheckAction } from "@/lib/gate-actions";
import { GATE_IDLE } from "@/lib/gate-types";
import { QrScanner } from "./QrScanner";
import { PillButton } from "./ui";

/**
 * Why a clearance is not usable, said the way a guard would say it.
 *
 * "revoked" and "expired" are the words the record uses and they are not wrong,
 * but at a gate the difference that matters is whether somebody took it away on
 * purpose or it simply ran out — and neither of those is a word most people
 * separate at a glance under pressure.
 */
const VALIDITY_LABEL: Record<string, string> = {
  valid: "in date",
  "never-granted": "never given",
  revoked: "taken away",
  expired: "run out",
};

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
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // A scan should behave like a scanner: read it, check it, no second action.
  function onScanned(value: string) {
    const input = inputRef.current;
    if (!input) return;
    input.value = value;
    formRef.current?.requestSubmit();
  }

  const result = state.status === "found" ? state.result : null;
  const validRoles = result?.holdings.filter((h) => h.validity === "valid") ?? [];
  const clear = Boolean(result?.registered && validRoles.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <QrScanner onResult={onScanned} />

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[320px] flex-1 flex-col gap-2">
          <span className="text-caption leading-caption text-label">
            No scanner? Type the ID printed on the card
          </span>
          <input
            ref={inputRef}
            name="identifier"
            placeholder="did:ethr:0x7a69:0x…"
            className="mono-addr rounded-2xl border border-mist-gray bg-paper-white px-4 py-3"
          />
        </label>
        <PillButton type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check this card"}
        </PillButton>
      </form>

      {presets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption leading-caption text-subtle">
            Or pick a name to try it out:
          </span>
          {presets.map((p) => (
            <form key={p.did} action={formAction}>
              <input type="hidden" name="identifier" value={p.did} />
              <button
                type="submit"
                className="rounded-full border border-mist-gray px-3 py-1.5 text-caption leading-caption text-label hover:border-ink-black hover:text-ink-black"
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
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-paper-white text-heading-sm text-subtle">
                  ?
                </div>
              )}
              <div>
                <h3 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
                  {clear ? "Cleared — let them through" : "Not cleared — do not admit"}
                </h3>
                <p className="mt-1 text-body leading-body">
                  {result.name ?? "Not in the staff records"}
                  {result.registered ? "" : " · no digital ID on the system"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-caption leading-caption opacity-70">Their status</p>
              <p className="text-body-lg leading-body-lg">{result.statusLabel}</p>
            </div>
          </div>

          <p className="mt-5 max-w-[62ch] text-caption leading-caption opacity-80">
            Now look at the person and compare them to the photo. This screen can
            only tell you the card is in order — whether the person holding it is
            the right one is still your call.
          </p>

          <div className="mt-6 border-t border-current/15 pt-5">
            <p className="text-caption leading-caption opacity-70">Their clearances</p>
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
                    ? ` · until ${formatExpiry(h.expiry)}`
                    : ` · ${VALIDITY_LABEL[h.validity] ?? h.validity}`}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-current/15 pt-5">
            <p className="text-caption leading-caption opacity-70">
              Equipment they are holding
            </p>
            {result.assets.length === 0 ? (
              <p className="mt-2 text-body leading-body">None.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {result.assets.map((a) => (
                  <li key={a.tokenId} className="text-body leading-body">
                    Item #{a.tokenId} — needs {a.requiredRoleLabel} clearance ·{" "}
                    {a.permitted ? "allowed to carry" : "NOT allowed to carry"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Checked now, not read from anything cached — which is the whole
              reason a clearance taken away a minute ago already shows here. The
              ID stays as a tooltip for anyone who needs to quote it. */}
          <p className="mt-6 text-caption leading-caption opacity-70" title={result.did}>
            Checked against the shared record just now.
          </p>
        </div>
      ) : null}
    </div>
  );
}
