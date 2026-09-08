"use client";

import { useState } from "react";

/**
 * When the record was written to.
 *
 * The lead tile of the dashboard, and the only chart here with a hover layer:
 * a bar's height is a magnitude you can compare but not read, so the exact
 * count and the bucket it covers have to be available on demand. The ranked
 * lists label every value directly and so need no tooltip.
 *
 * One series, so no legend — the tile's title names it. Buckets are equal
 * spans of the real elapsed time between the first and last event, which is
 * why an idle stretch shows as empty bars rather than being closed up: a gap
 * in the record is information about the record.
 */

export interface Bucket {
  /** Start of the bucket, unix seconds — the React key, never formatted here. */
  from: number;
  count: number;
  /**
   * Pre-formatted clock labels.
   *
   * Formatting dates in a client component is a hydration bug waiting to
   * happen: toLocaleTimeString reads the host's locale and timezone, so the
   * server and the browser disagree and React throws away the markup. The
   * server formats once and this renders the string.
   */
  fromLabel: string;
  toLabel: string;
}

export function EventsOverTime({ buckets }: { buckets: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);
  const total = buckets.reduce((s, b) => s + b.count, 0);

  if (buckets.length === 0 || total === 0) {
    return (
      <p className="mt-4 text-caption leading-caption text-label">
        Nothing recorded yet. This fills in as the system is used.
      </p>
    );
  }

  const active = hover === null ? null : buckets[hover];

  return (
    <div className="mt-4">
      {/* Reserved so the row does not appear and disappear under the cursor,
          which would shift the chart every time the pointer crossed it. */}
      <p className="h-5 text-caption leading-caption text-label">
        {active ? (
          <>
            <span className="tabular text-ink-black">{active.count}</span>{" "}
            {active.count === 1 ? "change" : "changes"} between{" "}
            <span className="tabular">{active.fromLabel}</span> and{" "}
            <span className="tabular">{active.toLabel}</span>
          </>
        ) : (
          <>
            <span className="tabular text-ink-black">{total}</span>{" "}
            {total === 1 ? "change" : "changes"} recorded &mdash; hover a bar for a
            time
          </>
        )}
      </p>

      <div
        className="mt-3 flex h-28 items-end gap-[2px]"
        onMouseLeave={() => setHover(null)}
      >
        {buckets.map((b, i) => {
          // A recorded event always draws something: a bar that rounds to zero
          // would read as an empty interval, which is a different fact.
          const h = max > 0 ? (b.count / max) * 100 : 0;
          const height = b.count > 0 ? Math.max(6, h) : 0;

          return (
            <button
              key={b.from}
              type="button"
              className="group relative flex h-full flex-1 cursor-default items-end bg-transparent p-0"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${b.count} changes between ${b.fromLabel} and ${b.toLabel}`}
            >
              {/* The hit target is the whole column; the mark is only the bar. */}
              <span
                className={`w-full rounded-t-[4px] transition-colors ${
                  hover === i ? "bg-ink-black" : "bg-[#c9ccd4]"
                } ${b.count === 0 ? "h-px bg-[#e7e7ea]" : ""}`}
                style={b.count > 0 ? { height: `${height}%` } : undefined}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-label">
        <span className="tabular">{buckets[0]!.fromLabel}</span>
        <span className="tabular">{buckets[buckets.length - 1]!.toLabel}</span>
      </div>
    </div>
  );
}
