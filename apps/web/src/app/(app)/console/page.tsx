import Link from "next/link";

import { AssetsTable } from "@/components/AssetsTable";
import { PageHeading } from "@/components/PageHeading";
import { EventsOverTime, type Bucket } from "@/components/dash/EventsOverTime";
import { ShareBarList, type ShareRow } from "@/components/dash/ShareBarList";
import { Card } from "@/components/ui";
import { loadPeople, shortAddress } from "@/lib/chain";
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
 * So the shapes are the block's and every series is read from the chain:
 * when it was written to, how credentials are distributed, which contract
 * emitted what, who holds which asset. Nothing here is seeded or estimated.
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

function credentialsByRole(state: ConsoleState): ShareRow[] {
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

function credentialHealth(state: ConsoleState): ShareRow[] {
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
    { label: "Valid", value: valid, note: "in force" },
    { label: "Revoked", value: revoked, note: "withdrawn", flagged: revoked > 0 },
    { label: "Expired", value: expired, note: "lapsed", flagged: expired > 0 },
  ];
}

function eventsByContract(entries: AuditEntry[]): ShareRow[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.contract, (counts.get(e.contract) ?? 0) + 1);
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
    .map(([label, value]) => ({ label, value, note: value === 1 ? "asset" : "assets" }))
    .sort((a, b) => b.value - a.value);
}

function NotDeployed() {
  return (
    <Card>
      <h2 className="display-serif text-heading-sm leading-heading-sm tracking-heading-sm">
        No chain to talk to
      </h2>
      <p className="mt-3 text-body leading-body">
        Start a node and deploy the contracts, then reload this page.
      </p>
      <pre className="mono-addr mt-5 overflow-x-auto rounded-2xl bg-paper-white px-5 py-4 leading-relaxed">
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
            className="text-[12px] text-label underline underline-offset-2 hover:text-ink-black"
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

  const highestBlock = entries.reduce(
    (m, e) => (e.blockNumber > m ? e.blockNumber : m),
    0n,
  );

  return (
    <>
      <PageHeading title="Dashboard">
        What the chain currently holds. Every figure here is read from contract
        state, not from a cache — the numbers and the chain cannot disagree.
      </PageHeading>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile title="Chain activity" wide link={{ href: "/audit", label: "Audit trail →" }}>
          <EventsOverTime buckets={bucketEvents(entries)} />
        </Tile>

        <Tile title="Credential health" link={{ href: "/console/credentials", label: "Issue →" }}>
          <ShareBarList rows={credentialHealth(state)} />
        </Tile>

        <Tile title="Deployment">
          <dl className="mt-4 flex flex-col gap-3">
            {[
              ["Chain", String(state.deployment.chainId)],
              ["Height", highestBlock === 0n ? "—" : `block ${highestBlock}`],
              ["People", `${state.personas.length} · ${credentialled} credentialled`],
              ["AssetToken", shortAddress(state.deployment.contracts.AssetToken)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="text-caption leading-caption text-label">{k}</dt>
                <dd className="mono-addr text-ink-black">{v}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile title="Credentials in force" link={{ href: "/console/people", label: "People →" }}>
          <ShareBarList
            rows={credentialsByRole(state)}
            emptyNote="No credential is currently valid."
          />
        </Tile>

        <Tile title="Events by contract">
          <ShareBarList rows={eventsByContract(entries)} emptyNote="No events yet." />
        </Tile>

        <Tile title="Assets by holder" link={{ href: "/console/assets", label: "Assets →" }}>
          <ShareBarList rows={assetsByHolder(state, people)} emptyNote="No assets minted." />
        </Tile>
      </div>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-subheading leading-subheading">Assets under custody</h2>
          <Link
            href="/console/assets"
            className="text-caption leading-caption text-label underline underline-offset-2 hover:text-ink-black"
          >
            Manage assets →
          </Link>
        </div>
        <div className="mt-5">
          <AssetsTable assets={state.assets} people={people} />
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-subheading leading-subheading">Latest activity</h2>
          <Link
            href="/audit"
            className="text-caption leading-caption text-label underline underline-offset-2 hover:text-ink-black"
          >
            Full audit trail →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-5 text-body leading-body text-label">
            Nothing has happened on this chain yet.
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
                <p className="mono-addr mt-1 text-subtle">
                  block {entry.blockNumber.toString()} · {entry.contract}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
