import { ArrowLink } from "@/components/ArrowLink";
import { AssetsTable } from "@/components/AssetsTable";
import { PageHeading } from "@/components/PageHeading";
import { EventsOverTime, type Bucket } from "@/components/dash/EventsOverTime";
import { ShareBarList, type ShareRow } from "@/components/dash/ShareBarList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPeople, shortAddress } from "@/lib/chain";
import { areaLabel } from "@/lib/audit-labels";
import { loadAuditTrail, type AuditEntry } from "@/lib/audit";
import { loadEquipment } from "@/lib/equipment";
import { loadConsoleState, type ConsoleState } from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * The dashboard.
 *
 * Composition follows the @efferd/dashboard-5 block: a tile grid with a lead
 * chart, ranked lists carrying share bars, and small fact tiles. What the block
 * shipped inside those tiles did not come across — visitors, top countries,
 * referrers, browser share, web vitals. This system has no traffic and no
 * visitors, and filling analytics widgets with invented numbers on a defence
 * submission would be worse than having no dashboard at all.
 *
 * So the shapes are the block's and every series is read from the chain: when
 * it was written to, how clearances are distributed, what has been changing,
 * who holds which item. Nothing here is seeded or estimated.
 *
 * Tiles are titled with the question they answer rather than the thing they
 * count — "Who is holding what", not "Assets by holder". The reader is a stores
 * officer with a question, not an analyst browsing dimensions.
 *
 * Layout: one lead panel rather than six equal tiles. The activity chart is
 * the only tile with a time axis and the only one worth looking *at*, so it
 * takes the elevated surface and two thirds of the row; the machinery facts sit
 * beside it as a quiet list, not as a fourth card. The four ranked lists answer
 * four questions about the same people and items, so they share one surface
 * and are separated by hairlines — four boxes implied four unrelated things.
 */

const BUCKET_COUNT = 14;

/** Formatted on the server so the client never re-derives it. See Bucket. */
function clock(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Equal spans of real elapsed time, so an idle stretch stays visible as one. */
function bucketEvents(entries: AuditEntry[]): Bucket[] {
  if (entries.length === 0) return [];

  const times = entries.map((e) => e.timestamp).sort((a, b) => a - b);
  const first = times[0]!;
  const last = times[times.length - 1]!;
  // A demo chain can record everything inside one second; a zero-width span
  // would put every event in the last bucket and leave the rest empty.
  const span = Math.max(last - first, BUCKET_COUNT);
  const width = span / BUCKET_COUNT;

  const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => {
    const from = Math.round(first + i * width);
    const to = Math.round(first + (i + 1) * width);
    return { from, count: 0, fromLabel: clock(from), toLabel: clock(to) };
  });

  for (const t of times) {
    const i = Math.min(BUCKET_COUNT - 1, Math.floor((t - first) / width));
    buckets[i]!.count += 1;
  }
  return buckets;
}

function clearancesByLevel(state: ConsoleState): ShareRow[] {
  const counts = new Map<string, number>();
  for (const p of state.personas) {
    for (const h of p.holdings) {
      if (h.validity !== "valid") continue;
      counts.set(h.label, (counts.get(h.label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function clearanceStatus(state: ConsoleState): ShareRow[] {
  let valid = 0;
  let revoked = 0;
  let expired = 0;
  for (const p of state.personas) {
    for (const h of p.holdings) {
      if (h.validity === "valid") valid += 1;
      else if (h.validity === "revoked") revoked += 1;
      else if (h.validity === "expired") expired += 1;
    }
  }
  // Zero rows are kept: "no revocations" is a fact worth stating, and a list
  // that silently drops empty states makes the reader guess.
  return [
    { label: "In date", value: valid, note: "usable now" },
    { label: "Taken away", value: revoked, note: "withdrawn", flagged: revoked > 0 },
    { label: "Run out", value: expired, note: "past its date", flagged: expired > 0 },
  ];
}

/**
 * Grouped by the part of the operation it belongs to, not by which contract
 * emitted it. "RoleRegistry: 14" tells a stores officer nothing; "Clearances:
 * 14" tells them where the week went.
 */
function changesByArea(entries: AuditEntry[]): ShareRow[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const label = areaLabel(e.contract);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function assetsByHolder(
  state: ConsoleState,
  people: Awaited<ReturnType<typeof loadPeople>>,
): ShareRow[] {
  const counts = new Map<string, number>();
  for (const a of state.assets) {
    const person = people.find(
      (p) => p.address.toLowerCase() === a.owner.toLowerCase(),
    );
    const label = person?.name ?? shortAddress(a.owner);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value, note: value === 1 ? "item" : "items" }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Shown when the record cannot be reached. The commands stay, below a sentence
 * that does not need them: whoever is looking after the machine wants the exact
 * incantation, and whoever is merely using it needs to know it is not their
 * fault and who to ask.
 */
function NotDeployed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="display-serif text-heading-sm font-normal tracking-heading-sm">
          The shared record cannot be reached
        </CardTitle>
        <CardDescription className="text-body leading-body">
          Nothing is lost and nothing is wrong with what you were doing. The
          system needs to be started up again — ask whoever looks after it, then
          reload this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-caption leading-caption text-label">For whoever looks after it:</p>
        <pre className="mono-addr mt-2 overflow-x-auto rounded-2xl bg-paper-white px-5 py-4 leading-relaxed">
          {`pnpm --filter @sih26125/contracts node
pnpm demo:reset`}
        </pre>
      </CardContent>
    </Card>
  );
}

/** A titled block inside a shared surface: heading, optional link, content. */
function Panel({
  title,
  link,
  children,
  className = "",
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body leading-body font-[480]">{title}</h2>
        {link ? <ArrowLink href={link.href}>{link.label}</ArrowLink> : null}
      </div>
      {children}
    </section>
  );
}

/** Hairlines between the four ranked lists, following the grid at each width. */
function dividerFor(i: number): string {
  const line = "border-black/[0.06]";
  return [
    i > 0 ? `border-t ${line}` : "",
    i === 1 ? "md:border-t-0 md:border-l" : "",
    i === 2 ? "md:border-l-0 xl:border-t-0 xl:border-l" : "",
    i === 3 ? "md:border-l xl:border-t-0" : "",
  ].join(" ");
}

export default async function DashboardPage() {
  const [state, auditTrail, people, equipment] = await Promise.all([
    loadConsoleState(),
    loadAuditTrail(),
    loadPeople(),
    loadEquipment(),
  ]);

  if (!state) {
    return (
      <>
        <PageHeading title="Dashboard" />
        <NotDeployed />
      </>
    );
  }

  const entries = auditTrail ?? [];
  const recent = entries.slice(-6).reverse();
  const credentialled = state.personas.filter((p) =>
    p.holdings.some((h) => h.validity === "valid"),
  ).length;

  const facts: [string, string][] = [
    ["Changes recorded", entries.length === 0 ? "None yet" : String(entries.length)],
    ["People on file", String(state.personas.length)],
    ["With a clearance in date", String(credentialled)],
    ["Items under custody", String(state.assets.length)],
  ];

  const questions = [
    {
      title: "Clearances by status",
      link: { href: "/console/credentials", label: "Give one" },
      body: <ShareBarList rows={clearanceStatus(state)} />,
    },
    {
      title: "Who is cleared for what",
      link: { href: "/console/people", label: "People" },
      body: (
        <ShareBarList
          rows={clearancesByLevel(state)}
          emptyNote="Nobody holds a clearance that is in date."
        />
      ),
    },
    {
      title: "What has been changing",
      body: <ShareBarList rows={changesByArea(entries)} emptyNote="Nothing recorded yet." />,
    },
    {
      title: "Who is holding what",
      link: { href: "/console/assets", label: "Equipment" },
      body: (
        <ShareBarList rows={assetsByHolder(state, people)} emptyNote="No equipment added yet." />
      ),
    },
  ];

  return (
    <>
      <PageHeading title="Dashboard">
        Where everything stands right now. Every number here is counted fresh
        from the shared record each time you open this page, so nothing on it is
        out of date.
      </PageHeading>

      {/* lead row */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card variant="elevated" className="px-6 md:px-7">
          <Panel title="Activity over time" link={{ href: "/audit", label: "See the history" }}>
            <EventsOverTime buckets={bucketEvents(entries)} />
          </Panel>
        </Card>

        {/* The one block genuinely about the machinery, set as a plain list
            rather than a card: somebody has to be able to answer "is this
            thing on", and everyone else should be able to tell at a glance
            that it is not about their work. */}
        <section className="flex flex-col rounded-3xl border border-border px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-body leading-body font-[480]">System</h2>
            <span className="inline-flex items-center gap-2 text-caption text-subtle">
              <span
                aria-hidden
                className="size-[7px] rounded-full bg-ink-black shadow-[0_0_0_3px_rgba(23,25,28,0.08)]"
              />
              Connected
            </span>
          </div>
          <dl className="mt-auto flex flex-col pt-5">
            {facts.map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-3 border-t border-border py-3 last:pb-0"
              >
                <dt className="text-caption leading-caption text-label">{k}</dt>
                <dd className="tabular text-body-lg leading-none">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* four questions, one surface */}
      <div className="mt-5 grid rounded-3xl bg-mist-gray md:grid-cols-2 xl:grid-cols-4">
        {questions.map((q, i) => (
          <Panel
            key={q.title}
            title={q.title}
            link={q.link}
            className={`px-6 py-6 ${dividerFor(i)}`}
          >
            {q.body}
          </Panel>
        ))}
      </div>

      {/* equipment */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-subheading leading-subheading font-[480]">
            Equipment and who holds it
          </h2>
          <ArrowLink href="/console/assets">Manage equipment</ArrowLink>
        </div>
        <div className="mt-2">
          <AssetsTable assets={state.assets} people={people} equipment={equipment} />
        </div>
      </section>

      {/* recent */}
      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-subheading leading-subheading font-[480]">What happened recently</h2>
          <ArrowLink href="/audit">See everything</ArrowLink>
        </div>

        {recent.length === 0 ? (
          <p className="mt-6 text-body leading-body text-label">Nothing has been recorded yet.</p>
        ) : (
          // A short timeline: one spine, one node per change. Entries flagged
          // upstream as emphasis (revocations and the like) take a filled sienna
          // node and sienna text, never colour alone.
          <ol className="relative mt-2">
            {recent.map((entry) => (
              <li
                key={`${entry.transactionHash}-${entry.logIndex}`}
                className="timeline-row relative grid grid-cols-[20px_minmax(0,1fr)] gap-x-4 py-4"
              >
                <span
                  aria-hidden
                  className={`relative z-10 mt-[7px] size-[11px] rounded-full ${
                    entry.emphasis ? "bg-sienna-brown" : "bg-paper-white"
                  }`}
                  style={{
                    boxShadow: entry.emphasis
                      ? "0 0 0 3px var(--surface-canvas)"
                      : "inset 0 0 0 1.5px #b6bac3, 0 0 0 3px var(--surface-canvas)",
                  }}
                />
                <div className="min-w-0">
                  <p
                    className={`text-body leading-body text-pretty ${
                      entry.emphasis ? "text-sienna-brown" : ""
                    }`}
                  >
                    {entry.description}
                  </p>
                  <p className="mt-0.5 text-caption leading-caption text-label">
                    {areaLabel(entry.contract)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
