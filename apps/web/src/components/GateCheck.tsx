"use client";

import { useActionState, useRef } from "react";

import { gateCheckAction } from "@/lib/gate-actions";
import { GATE_IDLE } from "@/lib/gate-types";
import { QrScanner } from "./QrScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

/**
 * The verdict is read from across a desk, often by someone who is also
 * watching a queue. So it is a band across the top of the result — icon,
 * serif verdict, the person's name — and everything under it is supporting
 * detail. A guard who reads nothing else has still read the right thing.
 *
 * Cleared is ink on white; not cleared is DESIGN.md's refusal pair, sienna on
 * blush. The two never share a surface colour, so the answer is legible before
 * a word of it is.
 */
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <QrScanner onResult={onScanned} />

        <div className="flex flex-col gap-6 rounded-3xl bg-mist-gray p-5 md:p-6">
          <form ref={formRef} action={formAction} className="flex flex-col gap-3">
            <label htmlFor="gate-identifier" className="text-caption leading-caption font-[480] text-label">
              No scanner? Type the ID printed on the card
            </label>
            <div className="flex flex-wrap gap-3">
              <Input
                id="gate-identifier"
                ref={inputRef}
                name="identifier"
                placeholder="did:ethr:0x7a69:0x…"
                autoComplete="off"
                spellCheck={false}
                className="mono-addr min-w-0 flex-1 basis-64"
              />
              <Button type="submit" disabled={pending}>
                {pending ? "Checking…" : "Check this card"}
              </Button>
            </div>
          </form>

          {presets.length > 0 ? (
            <div className="border-t border-black/[0.06] pt-5">
              <p className="text-caption leading-caption text-subtle">
                Or pick a name to try it out
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <form key={p.did} action={formAction}>
                    <input type="hidden" name="identifier" value={p.did} />
                    <Button type="submit" variant="ghost" size="sm" className="border-black/15 bg-paper-white">
                      {p.label}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {state.status === "error" ? (
        <div role="alert" className="rounded-3xl border border-border px-7 py-6">
          <p className="text-body leading-body">{state.message}</p>
        </div>
      ) : null}

      {result ? (
        <article
          aria-live="polite"
          className={`refusal-in overflow-hidden rounded-3xl ${
            clear ? "bg-paper-white shadow-subtle-3" : "bg-blush-peach text-sienna-brown shadow-subtle"
          }`}
        >
          {/* ---------------------------------------------------------- verdict */}
          <header
            className={`flex flex-wrap items-center gap-x-5 gap-y-3 px-7 py-6 md:px-9 ${
              clear ? "border-b border-border" : "border-b border-sienna-brown/15"
            }`}
          >
            {clear ? (
              <svg
                aria-hidden
                viewBox="0 0 40 40"
                className="size-11 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="20" cy="20" r="17" />
                <path d="m12.5 20.5 5 5 10-11" />
              </svg>
            ) : (
              <svg
                aria-hidden
                viewBox="0 0 40 40"
                className="size-11 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <circle cx="20" cy="20" r="17" />
                <path d="M8 20h24" className="refusal-bar" />
              </svg>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="display-serif text-[clamp(28px,3vw,38px)] leading-[1.1] tracking-[-0.018em]">
                {clear ? "Cleared — let them through" : "Not cleared — do not admit"}
              </h3>
              <p className="mt-1 text-body-lg leading-tight">
                {result.name ?? "Not in the staff records"}
                {result.registered ? "" : " · no digital ID on the system"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-caption leading-caption opacity-70">Their status</p>
              <p className="text-body-lg leading-tight font-[480]">{result.statusLabel}</p>
            </div>
          </header>

          {/* ---------------------------------------------------------- detail */}
          <div className="grid gap-7 px-7 py-7 md:grid-cols-[132px_minmax(0,1fr)] md:gap-9 md:px-9">
            {/* Card proportions, so it reads as the photo on the card rather than
                an avatar — it is the thing the guard compares a face against. */}
            <div className="w-[132px]">
              {result.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.photo}
                  alt={result.name ? `Photo on file for ${result.name}` : "Photo on file"}
                  className="aspect-[3/4] w-full rounded-2xl object-cover ring-1 ring-black/10"
                />
              ) : (
                <div
                  className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl ${
                    clear ? "bg-mist-gray text-label" : "bg-paper-white/50"
                  }`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="size-8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  >
                    <circle cx="12" cy="9" r="3.5" />
                    <path d="M5.5 19.5c1-3.2 3.6-5 6.5-5s5.5 1.8 6.5 5" />
                  </svg>
                  <span className="text-[12px]">No photo</span>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="max-w-[60ch] text-body leading-[1.5] text-pretty">
                Now look at the person and compare them to the photo. This screen
                can only tell you the card is in order — whether the person
                holding it is the right one is still your call.
              </p>

              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-caption leading-caption opacity-70">Their clearances</dt>
                  <dd className="mt-2.5 flex flex-wrap gap-2">
                    {result.holdings.length === 0 ? (
                      <span className="text-body">None.</span>
                    ) : (
                      result.holdings.map((h) => (
                        <Badge
                          key={h.label}
                          variant={h.validity === "valid" ? "ink" : clear ? "outline" : "refusal"}
                          className={
                            h.validity === "valid"
                              ? ""
                              : clear
                                ? "text-label"
                                : "border-sienna-brown/25 bg-transparent"
                          }
                        >
                          {h.label}
                          <span className="opacity-70">
                            {h.validity === "valid"
                              ? `until ${formatExpiry(h.expiry)}`
                              : VALIDITY_LABEL[h.validity] ?? h.validity}
                          </span>
                        </Badge>
                      ))
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-caption leading-caption opacity-70">
                    Equipment they are holding
                  </dt>
                  <dd className="mt-2.5">
                    {result.assets.length === 0 ? (
                      <p className="text-body leading-body">None.</p>
                    ) : (
                      <ul className="flex flex-col">
                        {result.assets.map((a) => (
                          <li
                            key={a.tokenId}
                            className={`flex items-baseline justify-between gap-3 border-t py-2.5 first:border-t-0 first:pt-0 ${
                              clear ? "border-border" : "border-sienna-brown/15"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="tabular">Item #{a.tokenId}</span>
                              <span className="block text-caption leading-caption opacity-70">
                                needs {a.requiredRoleLabel} clearance
                              </span>
                            </span>
                            <span
                              className={`shrink-0 text-caption leading-caption ${
                                a.permitted ? "" : "font-[500] text-sienna-brown"
                              }`}
                            >
                              {a.permitted ? "Allowed to carry" : "NOT allowed to carry"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </dl>

              {/* Checked now, not read from anything cached — which is the whole
                  reason a clearance taken away a minute ago already shows here.
                  The ID stays as a tooltip for anyone who needs to quote it. */}
              <p className="mt-7 text-caption leading-caption opacity-70" title={result.did}>
                Checked against the shared record just now.
              </p>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
