import { areaLabel } from "@/lib/audit-labels";
import type { AuditEntry } from "@/lib/audit";

function formatTime(timestamp: number): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export function AuditTrail({
  entries,
  filtered = false,
}: {
  entries: AuditEntry[];
  /** Changes the empty state: "nothing happened" and "nothing matched" are
   * different facts, and telling an auditor the wrong one is misleading. */
  filtered?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border px-6 py-10 text-center text-body leading-body text-label">
        {filtered
          ? "Nothing matches what you searched for."
          : "Nothing has been recorded yet."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[70ch] text-caption leading-[1.55] text-subtle">
        This list is not a summary written alongside the work — it is built from
        the record of the work itself, so the two cannot drift apart. Nothing here
        was typed in by anybody, and nothing here can be edited afterwards.
      </p>

      {/* A ledger, not a feed. Time sits in its own column so the eye can run
          down it; one spine joins the entries so the list reads as a single
          continuous record; entries the replay marks as emphasis (a refusal, a
          revocation) take a filled sienna node as well as sienna text. */}
      <ol className="flex flex-col border-t border-border">
        {entries.map((entry) => (
          <li
            key={`${entry.transactionHash}-${entry.logIndex}`}
            className="group grid grid-cols-[20px_minmax(0,1fr)] gap-x-4 border-b border-border/70 py-4 transition-colors duration-150 hover:bg-fog-white md:grid-cols-[132px_20px_minmax(0,1fr)] md:gap-x-5"
          >
            <span className="tabular hidden pt-0.5 text-caption leading-caption text-label md:block">
              {formatTime(entry.timestamp)}
            </span>
            <span aria-hidden className="flex justify-center pt-[7px]">
              <span
                className={`size-[11px] rounded-full ${
                  entry.emphasis
                    ? "bg-sienna-brown"
                    : "bg-paper-white shadow-[inset_0_0_0_1.5px_#b6bac3]"
                }`}
              />
            </span>
            <div className="min-w-0">
              <p
                className={`text-body leading-body text-pretty ${
                  entry.emphasis ? "text-sienna-brown" : ""
                }`}
              >
                {entry.description}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption leading-caption text-label">
                <span className="tabular md:hidden">{formatTime(entry.timestamp)}</span>
                <span className="text-ink-black/80">{areaLabel(entry.contract)}</span>
                {/* Kept, and kept quiet. Nobody reading this to find out where a
                    radar unit went needs a transaction hash — but an auditor
                    chasing one entry back to its origin does, and removing it
                    would make this page a summary rather than a record. */}
                <span className="mono-addr text-subtle" title={entry.transactionHash}>
                  {entry.transactionHash.slice(0, 18)}…
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-caption leading-caption text-subtle">
        Showing {entries.length}. Each line carries the reference it was recorded
        under, so any one of them can be traced back.
      </p>
    </div>
  );
}
