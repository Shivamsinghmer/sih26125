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

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-body leading-body text-slate-gray">
        Nothing has happened on this chain yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[70ch] text-body leading-body text-slate-gray">
        Reconstructed from chain events alone — no application database is consulted
        to build this view. The audit record is not a log about the transactions; it
        is the transactions, so the two can never disagree.
      </p>

      <ol className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={`${entry.transactionHash}-${entry.logIndex}`}
            className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-mist-gray py-4 md:grid-cols-[120px_150px_1fr]"
          >
            <span className="tabular text-caption leading-caption text-ash-gray">
              {formatTime(entry.timestamp)}
            </span>
            <span className="text-caption leading-caption text-ash-gray">
              {entry.contract}
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
              <p className="mono-addr mt-1 text-smoke-gray">
                block {entry.blockNumber.toString()} · {entry.transactionHash.slice(0, 18)}…
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-caption leading-caption text-smoke-gray">
        {entries.length} events. Every one carries the transaction that produced it.
      </p>
    </div>
  );
}
