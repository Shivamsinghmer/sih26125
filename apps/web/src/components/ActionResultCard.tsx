import type { ActionResult } from "@/lib/action-types";

/**
 * The rendered outcome of a chain write.
 *
 * A blocked handover is the loudest thing on the page and deliberately does not
 * look like an error toast — it is rendered on the accent surface, because it is
 * the system working, not the system failing. That distinction is the pitch.
 *
 * It also says what to do next. A refusal that only explains itself leaves the
 * reader hunting for an override that does not exist; naming the two real ways
 * forward is the difference between a wall and a door. They are set as two
 * items rather than one sentence so the reader can see there are exactly two.
 *
 * The refusal is the one element in the console with an authored entrance
 * (`.refusal-in` in globals.css). Everything else in the product loads straight
 * into the task; this is the moment the demo is built around, so it arrives.
 */
export function ActionResultCard({ result }: { result: ActionResult }) {
  if (result.status === "idle") return null;

  if (result.status === "blocked") {
    return (
      <div
        role="status"
        className="refusal-in relative overflow-hidden rounded-3xl bg-blush-peach text-sienna-brown shadow-subtle"
      >
        <div className="grid gap-6 px-7 py-7 md:grid-cols-[auto_minmax(0,1fr)] md:gap-7 md:px-9 md:py-8">
          {/* A barrier: the stroke of a closed gate across a ring. Drawn in the
              card's own ink rather than borrowed from a warning-sign vocabulary,
              which would make a working refusal look like a malfunction. */}
          <svg
            aria-hidden
            viewBox="0 0 40 40"
            className="size-10 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <circle cx="20" cy="20" r="17" />
            <path d="M8 20h24" className="refusal-bar" />
          </svg>

          <div className="min-w-0">
            <h3 className="display-serif text-[clamp(26px,2.6vw,32px)] leading-[1.15] tracking-[-0.015em] text-balance">
              {result.title}
            </h3>
            <p className="mt-3 max-w-[56ch] text-body-lg leading-[1.45] text-pretty">
              {result.detail}
            </p>

            <div className="mt-6 border-t border-sienna-brown/15 pt-5">
              <p className="max-w-[62ch] text-caption leading-caption text-pretty text-sienna-brown/80">
                Nothing has moved. This was refused by the shared record itself,
                not by this screen &mdash; so there is no account, and nobody
                senior, who can push it through.
              </p>
              <ul className="mt-4 grid gap-2 text-caption leading-caption sm:grid-cols-2 sm:gap-3">
                <li className="rounded-2xl bg-paper-white/55 px-4 py-3">
                  Give the person the clearance they are missing.
                </li>
                <li className="rounded-2xl bg-paper-white/55 px-4 py-3">
                  Or hand the item to somebody who already has it.
                </li>
              </ul>
            </div>

            {/* The decoded name of the refusal. Meaningless to most readers and
                deliberately last, but it is the string somebody quotes when they
                ring for help, so it stays on the page. */}
            {result.errorName ? (
              <p className="mono-addr mt-5 text-[12.5px] text-sienna-brown/55">
                {result.errorName}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-3xl bg-paper-white px-7 py-6 shadow-subtle"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="mt-0.5 size-6 shrink-0 text-ink-black"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m7.5 12.25 3 3 6-6.5" />
        </svg>
        <div className="min-w-0">
          <p className="text-body-lg leading-[1.45] text-pretty">{result.message}</p>
          {result.hash ? (
            <p className="mono-addr mt-1.5 text-[12.5px] text-label">
              Recorded · reference {result.hash.slice(0, 18)}…
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className="rounded-3xl border border-border bg-paper-white px-7 py-6">
      <p className="text-caption leading-caption text-label">
        Something went wrong before this could be recorded. Nothing has changed.
      </p>
      <p className="mt-2 text-body leading-body">{result.message}</p>
    </div>
  );
}
