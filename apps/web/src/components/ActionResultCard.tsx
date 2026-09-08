import type { ActionResult } from "@/lib/action-types";

/**
 * The rendered outcome of a chain write.
 *
 * A blocked transfer is the loudest thing on the page and deliberately does not
 * look like an error toast — it is rendered on the accent surface, because it is
 * the system working, not the system failing. That distinction is the pitch.
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
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
            {result.title}
          </h3>
          <span className="mono-addr opacity-60">{result.errorName}</span>
        </div>
        <p className="mt-3 text-body-lg leading-body-lg">{result.detail}</p>
        <p className="mt-5 text-caption leading-caption opacity-70">
          Rejected by AssetToken._update on chain — not by this interface. The same
          call from a script or any other client fails identically.
        </p>
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
          <p className="mono-addr mt-2 text-label">{result.hash}</p>
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
        Something went wrong before the contract was reached.
      </p>
      <p className="mt-2 text-body leading-body">{result.message}</p>
    </div>
  );
}
