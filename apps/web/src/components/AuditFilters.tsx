"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuditPage } from "@/lib/audit";

/**
 * Filters that apply as you change them.
 *
 * State still lives in the URL rather than in component state, so a filtered
 * view remains bookmarkable and shareable — an auditor pasting a finding into a
 * report needs the link to reproduce what they saw. The controls just drive the
 * URL directly instead of waiting for a submit.
 *
 * Typing is debounced; selects are not. A dropdown change is a decision that is
 * already final, and delaying it would only feel broken.
 */
export function AuditFilters({
  result,
  current,
}: {
  result: AuditPage;
  current: { contract: string; event: string; q: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [text, setText] = useState(current.q);
  // Tracks what the URL already reflects, so the debounce does not re-navigate
  // to the value the server just rendered.
  const applied = useRef(current.q);

  function navigate(next: { contract?: string; event?: string; q?: string }) {
    const contract = next.contract ?? current.contract;
    const event = next.event ?? current.event;
    const q = next.q ?? text;

    const search = new URLSearchParams();
    if (contract !== "all") search.set("contract", contract);
    if (event !== "all") search.set("event", event);
    if (q.trim()) search.set("q", q.trim());
    // Any change to the filters invalidates the page number: page 3 of the old
    // result set is meaningless against the new one.

    applied.current = q;
    const qs = search.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (text === applied.current) return;
    const timer = setTimeout(() => navigate({ q: text }), 250);
    return () => clearTimeout(timer);
    // navigate closes over current/text deliberately; re-running on text alone
    // is what makes this a debounce rather than a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // A filter changed on the server (say, Clear was used) — follow it.
  useEffect(() => {
    setText(current.q);
    applied.current = current.q;
  }, [current.q]);

  const filtered =
    current.contract !== "all" || current.event !== "all" || current.q !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-caption leading-caption text-slate-gray">Contract</span>
          <select
            name="contract"
            value={current.contract}
            onChange={(e) => navigate({ contract: e.target.value })}
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          >
            <option value="all">All contracts</option>
            {result.contracts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-caption leading-caption text-slate-gray">Event</span>
          <select
            name="event"
            value={current.event}
            onChange={(e) => navigate({ event: e.target.value })}
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          >
            <option value="all">All events</option>
            {result.eventNames.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[240px] flex-1 flex-col gap-2">
          <span className="text-caption leading-caption text-slate-gray">
            Search the record
          </span>
          <input
            name="q"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="a name, an asset number, a DID…"
            className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
          />
        </label>

        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              applied.current = "";
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="rounded-full border border-mist-gray px-5 py-3 text-body text-slate-gray hover:border-ink-black hover:text-ink-black"
          >
            Clear
          </button>
        ) : null}
      </div>

      <p className="text-caption leading-caption text-smoke-gray" aria-live="polite">
        {pending
          ? "Filtering…"
          : `${
              filtered
                ? `${result.matched} of ${result.total} events match`
                : `${result.total} events recorded`
            }${result.pageCount > 1 ? ` · page ${result.page} of ${result.pageCount}` : ""}`}
      </p>
    </div>
  );
}
