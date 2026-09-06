import { AppHeader } from "@/components/AppHeader";
import { AuditTrail } from "@/components/AuditTrail";
import { loadAuditTrail } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * The auditor's surface: the same replay the console shows, with none of the
 * controls that change anything. An auditor who can also issue credentials is
 * not an auditor.
 */
export default async function AuditPage() {
  const entries = await loadAuditTrail();

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-32 pt-10">
      <AppHeader />

      <h1 className="display-serif mt-14 text-heading leading-heading tracking-heading">
        Replay the whole history
      </h1>
      <p className="mt-4 max-w-[66ch] text-body-lg leading-body-lg text-slate-gray">
        Every identity, credential, mint and transfer, reconstructed from chain
        events in order. Read-only by design — this view cannot change anything
        it reports on.
      </p>

      <div className="mt-10">
        {entries === null ? (
          <div className="rounded-3xl bg-mist-gray px-8 py-7">
            <p className="text-body leading-body">
              No chain to read. Deploy the contracts and reload.
            </p>
          </div>
        ) : (
          <AuditTrail entries={entries} />
        )}
      </div>
    </main>
  );
}
