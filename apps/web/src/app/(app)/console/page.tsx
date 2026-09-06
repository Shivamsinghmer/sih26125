import Link from "next/link";

import { AssetsTable } from "@/components/AssetsTable";
import { PageHeading } from "@/components/PageHeading";
import { Card } from "@/components/ui";
import { loadPeople } from "@/lib/chain";
import { loadAuditTrail } from "@/lib/audit";
import { loadConsoleState } from "@/lib/state";

export const dynamic = "force-dynamic";

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

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-caption leading-caption text-slate-gray">{label}</p>
      <p className="display-serif mt-2 text-heading leading-none tracking-heading">{value}</p>
      <p className="mt-3 text-caption leading-caption text-smoke-gray">{hint}</p>
    </Card>
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

  const credentialled = state.personas.filter((p) =>
    p.holdings.some((h) => h.validity === "valid"),
  ).length;
  const revoked = state.personas.filter((p) =>
    p.holdings.some((h) => h.validity === "revoked"),
  ).length;
  const recent = (auditTrail ?? []).slice(-6).reverse();

  return (
    <>
      <PageHeading title="Dashboard">
        What the chain currently holds. Every figure here is read from contract
        state, not from a cache — the numbers and the chain cannot disagree.
      </PageHeading>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="People"
          value={String(state.personas.length)}
          hint={`${credentialled} hold a valid credential`}
        />
        <Stat
          label="Assets"
          value={String(state.assets.length)}
          hint="each bound to a holder's DID"
        />
        <Stat
          label="Revoked credentials"
          value={String(revoked)}
          hint={revoked === 0 ? "nobody offboarded yet" : "still visible in the audit trail"}
        />
        <Stat
          label="Recorded events"
          value={String((auditTrail ?? []).length)}
          hint="replayable from the chain alone"
        />
      </div>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-subheading leading-subheading">Assets under custody</h2>
          <Link
            href="/console/assets"
            className="text-caption leading-caption text-slate-gray underline underline-offset-2 hover:text-ink-black"
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
            className="text-caption leading-caption text-slate-gray underline underline-offset-2 hover:text-ink-black"
          >
            Full audit trail →
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-5 text-body leading-body text-slate-gray">
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
                <p className="mono-addr mt-1 text-smoke-gray">
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
