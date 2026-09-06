import { PageHeading } from "@/components/PageHeading";
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
    <>
      <PageHeading title="Replay the whole history">
        Every identity, credential, mint and transfer, reconstructed from chain
        events in order. Read-only by design — this view cannot change anything
        it reports on.
      </PageHeading>

      <div>
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
    </>
  );
}
