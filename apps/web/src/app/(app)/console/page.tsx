import Link from "next/link";

import { AssetsTable } from "@/components/AssetsTable";
import { PageHeading } from "@/components/PageHeading";
import { EventsOverTime, type Bucket } from "@/components/dash/EventsOverTime";
import { ShareBarList, type ShareRow } from "@/components/dash/ShareBarList";
import { Card } from "@/components/ui";
import { loadPeople, shortAddress } from "@/lib/chain";
import { areaLabel } from "@/lib/audit-labels";
import { loadAuditTrail, type AuditEntry } from "@/lib/audit";
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
 * Installing the block outright was not an option either way: it needs shadcn
 * scaffolding, and `shadcn init` rewrites globals.css, which is where the Steep
 * design system lives.
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
      <h2 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
        The shared record cannot be reached
      </h2>
      <p className="mt-3 max-w-[62ch] text-body leading-body">
        Nothing is lost and nothing is wrong with what you were doing. The
        system needs to be started up again — ask whoever looks after it, then
        reload this page.
      </p>
      <p className="mt-5 text-caption leading-caption text-label">
        For whoever looks after it:
      </p>
      <pre className="mono-addr mt-2 overflow-x-auto rounded-2xl bg-paper-white px-5 py-4 leading-relaxed">
        {`pnpm --filter @sih26125/contracts node
pnpm demo:reset`}
      </pre>
    </Card>
  );
}

function Tile({
  title,
  link,
  children,
  wide = false,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-3xl bg-mist-gray px-5 py-5 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-caption leading-caption text-ink-black">{title}</h2>
        {link ? (
          <Link
            href={link.href}
            // shrink-0 and nowrap: a two-line tile title was squeezing the link
            // until its own arrow wrapped onto a second line under it.
            className="shrink-0 whitespace-nowrap text-[12px] text-label underline underline-offset-2 hover:text-ink-black"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const [state, auditTrail, people] = await Promise.all([
    loadConsoleState(),
    loadAuditTrail(),
    loadPeople(),
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

  return (
    <>
      <PageHeading title="Dashboard">
        Where everything stands right now. Every number here is counted fresh
        from the shared record each time you open this page, so nothing on it is
        out of date.
      </PageHeading>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile title="Activity over time" wide link={{ href: "/audit", label: "See the history →" }}>
          <EventsOverTime buckets={bucketEvents(entries)} />
        </Tile>

        <Tile
          title="Clearances by status"
          link={{ href: "/console/credentials", label: "Give one →" }}
        >
          <ShareBarList rows={clearanceStatus(state)} />
        </Tile>

        {/* The one tile that is genuinely about the machinery. Kept, because
            somebody has to be able to answer "is this thing actually on", and
            labelled so that everyone else can tell it is not about their work. */}
        <Tile title="System">
          <dl className="mt-4 flex flex-col gap-3">
            {[
              ["Status", "Connected"],
              ["Changes recorded", entries.length === 0 ? "—" : String(entries.length)],
              ["People on file", String(state.personas.length)],
              ["With a clearance", String(credentialled)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="text-caption leading-caption text-label">{k}</dt>
                <dd className="mono-addr text-ink-black">{v}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile title="Who is cleared for what" link={{ href: "/console/people", label: "People →" }}>
          <ShareBarList
            rows={clearancesByLevel(state)}
            emptyNote="Nobody holds a clearance that is in date."
          />
        </Tile>

        <Tile title="What has been changing">
          <ShareBarList rows={changesByArea(entries)} emptyNote="Nothing recorded yet." />
        </Tile>

        <Tile title="Who is holding what" link={{ href: "/console/assets", label: "Equipment →" }}>
          <ShareBarList
            rows={assetsByHolder(state, people)}
            emptyNote="No equipment added yet."
          />
        </Tile>
      </div>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-subheading leading-subheading">Equipment and who holds it</h2>
          <Link
            href="/console/assets"
            className="text-caption leading-caption text-label underline underline-offset-2 hover:text-ink-black"
          >
            Manage equipment →
          </Link>
        </div>
        <div className="mt-5">
          <AssetsTable assets={state.assets} people={people} />
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-subheading leading-subheading">What happened recently</h2>
          <Link
            href="/audit"
            className="text-caption leading-caption text-label underline underline-offset-2 hover:text-ink-black"
          >
            See everything →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-5 text-body leading-body text-label">
            Nothing has been recorded yet.
          </p>
        ) : (
          <ul className="mt-5 flex flex-col">
            {recent.map((entry) => (
              <li
                key={`${entry.transactionHash}-${entry.logIndex}`}
                className="border-t border-mist-gray py-4"
              >
                <p
                  className={
                    entry.emphasis
                      ? "text-body leading-body text-sienna-brown"
                      : "text-body leading-body"
                  }
                >
                  {entry.description}
                </p>
                <p className="text-caption leading-caption text-subtle">
                  {areaLabel(entry.contract)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
