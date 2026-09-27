import type { ReactNode } from "react";

/**
 * A titled operation on a console page: what it does on the left, the form on
 * the right.
 *
 * Every issuing-authority action (add a person, give or take away a clearance,
 * add equipment) used to be a heading, a caption and a wrapping row of fields
 * stacked under a rule. The fields wrapped wherever the width ran out, so the
 * same form had a different shape on every screen. Split into two columns, the
 * explanation is read once and stays put, and the form gets a stable grid.
 *
 * `id` sits on the heading so the rail's sub-links (`/console/people#onboard`)
 * still land on it.
 */
export function FormSection({
  id,
  title,
  description,
  flush = false,
  children,
}: {
  id?: string;
  /** Directly under the page heading, which already draws the rule. */
  flush?: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14 ${
        flush ? "" : "mt-16 border-t border-border pt-10"
      }`}
    >
      <div>
        <h2 id={id} className="scroll-mt-6 text-subheading leading-subheading font-[480] text-balance">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-[48ch] text-caption leading-[1.55] text-pretty text-subtle">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** The four console pages' shared outage state. */
export function RecordUnreachable() {
  return (
    <div role="status" className="rounded-3xl border border-border px-6 py-6">
      <p className="text-body-lg leading-tight font-[480]">The shared record cannot be reached</p>
      <p className="mt-2 max-w-[60ch] text-body leading-body text-subtle">
        Nothing is lost. Ask whoever looks after the system to start it again,
        then reload this page.
      </p>
    </div>
  );
}
