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
      <p className="text-body leading-body text-label">
        {filtered
          ? "Nothing matches what you searched for."
          : "Nothing has been recorded yet."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[70ch] text-body leading-body text-label">
        This list is not a summary written alongside the work — it is built from
        the record of the work itself, so the two cannot drift apart. Nothing here
        was typed in by anybody, and nothing here can be edited afterwards.
      </p>

      <ol className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={`${entry.transactionHash}-${entry.logIndex}`}
            className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-mist-gray py-4 md:grid-cols-[120px_150px_1fr]"
          >
            <span className="tabular text-caption leading-caption text-label">
              {formatTime(entry.timestamp)}
            </span>
            <span className="text-caption leading-caption text-label">
              {areaLabel(entry.contract)}
            </span>
            <div className="col-span-2 md:col-span-1">
              <p
                className={
                  entry.emphasis
                    ? "text-body leading-body text-sienna-brown"
                    : "text-body leading-body"
                }
              >
                {entry.description}
              </p>
              {/* Kept, and kept quiet. Nobody reading this to find out where a
                  radar unit went needs a transaction hash — but an auditor
                  chasing one entry back to its origin does, and removing it
                  would make this page a summary rather than a record. */}
              <p className="mono-addr mt-1 text-subtle">
                reference {entry.transactionHash.slice(0, 18)}…
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
