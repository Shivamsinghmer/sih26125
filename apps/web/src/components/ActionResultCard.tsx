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
 * forward is the difference between a wall and a door.
 */
export function ActionResultCard({ result }: { result: ActionResult }) {
  if (result.status === "idle") return null;

  if (result.status === "blocked") {
    return (
      <div
        role="status"
        className="rounded-3xl bg-blush-peach px-8 py-7 text-sienna-brown"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <h3 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
          {result.title}
        </h3>
        <p className="mt-3 text-body-lg leading-body-lg">{result.detail}</p>
        <p className="mt-5 max-w-[62ch] text-caption leading-caption opacity-80">
          Nothing has moved. This was refused by the shared record itself, not by
          this screen &mdash; so there is no account, and nobody senior, who can
          push it through. Give the person the clearance they are missing, or
          hand the item to somebody who already has it.
        </p>
        {/* The decoded name of the refusal. Meaningless to most readers and
            deliberately last, but it is the string somebody quotes when they
            ring for help, so it stays on the page. */}
        {result.errorName ? (
          <p className="mono-addr mt-4 text-[13px] opacity-50">{result.errorName}</p>
        ) : null}
      </div>
    );
  }

  if (result.status === "success") {
    return (
      <div
        role="status"
        className="rounded-3xl bg-mist-gray px-8 py-6"
        style={{ boxShadow: "var(--shadow-subtle)" }}
      >
        <p className="text-body-lg leading-body-lg">{result.message}</p>
        {result.hash ? (
          <p className="mono-addr mt-2 text-[13px] text-label">
            reference {result.hash.slice(0, 18)}…
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-3xl border border-mist-gray bg-fog-white px-8 py-6"
    >
      <p className="text-caption leading-caption text-label">
        Something went wrong before this could be recorded. Nothing has changed.
      </p>
      <p className="mt-2 text-body leading-body">{result.message}</p>
    </div>
  );
}
