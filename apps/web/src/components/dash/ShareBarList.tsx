/**
 * A ranked list with share bars.
 *
 * The signature of the @efferd/dashboard-5 block, rebuilt in Steep. The block
 * paints its bar as a background behind the row's text, which puts label and
 * value on a coloured fill; here the bar sits under the row instead, so the
 * text keeps full contrast on the card surface and the bar is a pure magnitude
 * mark. That is the only structural change.
 *
 * Every list here is one series measuring magnitude within a category, so it
 * takes one hue rather than a categorical palette — there are no identities to
 * tell apart, only sizes to compare. The one exception is a row the caller
 * marks as `flagged`, which takes the system's reserved sienna and always
 * carries a text label as well, never colour alone.
 *
 * Marks follow the spec: 4px rounded ends anchored to the baseline, a recessive
 * track, and every value directly labelled — which is why these rows need no
 * hover layer. Identity and magnitude are both already on screen.
 */

export interface ShareRow {
  label: string;
  value: number;
  /** Shown after the count — a unit, a share, or a qualifier. */
  note?: string;
  /** Reserved for a state that is genuinely a problem, not for emphasis. */
  flagged?: boolean;
}

export function ShareBarList({
  rows,
  emptyNote = "Nothing recorded yet.",
}: {
  rows: ShareRow[];
  emptyNote?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  if (rows.length === 0) {
    return <p className="mt-4 text-caption leading-caption text-label">{emptyNote}</p>;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {rows.map((row) => {
        // Share of the largest row, not of the total: this ranks magnitudes
        // against each other, and a percent-of-total bar would read as a part
        // of a whole the list does not claim to be.
        // A non-zero value always draws something, so a small count is not
        // mistaken for none. Zero draws nothing at all: a minimum-width mark on
        // an empty row claims a magnitude that is not there.
        const share =
          row.value === 0 || max === 0
            ? 0
            : Math.max(3, Math.round((row.value / max) * 100));

        return (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-caption leading-caption text-ink-black">
                {row.label}
              </span>
              <span className="shrink-0 text-caption leading-caption text-ink-black">
                <span className="tabular">{row.value}</span>
                {row.note ? (
                  <span className="ml-1.5 text-label">{row.note}</span>
                ) : null}
              </span>
            </div>

            <div
              className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#e7e7ea]"
              role="presentation"
            >
              <div
                className={`h-full rounded-full ${
                  row.flagged ? "bg-sienna-brown" : "bg-ink-black"
                }`}
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
