import { AuditFilters } from "@/components/AuditFilters";
import { AuditPagination } from "@/components/AuditPagination";
import { AuditTrail } from "@/components/AuditTrail";
import { PageHeading } from "@/components/PageHeading";
import { loadAuditTrail, queryAuditTrail } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * The auditor's surface: the same replay the console shows, with none of the
 * controls that change anything. An auditor who can also issue credentials is
 * not an auditor.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const current = {
    contract: one("contract") ?? "all",
    event: one("event") ?? "all",
    q: one("q") ?? "",
  };
  const page = Number.parseInt(one("page") ?? "1", 10);

  const entries = await loadAuditTrail();

  return (
    <>
      <PageHeading title="History">
        Everything that has happened, in the order it happened: every ID
        created, every clearance given or taken away, and every handover. Nothing
        on this page can be edited — not by you, and not by anyone.
      </PageHeading>

      {entries === null ? (
        <div className="rounded-3xl bg-mist-gray px-8 py-7">
          <p className="text-body leading-body">
            The shared record cannot be reached at the moment. Ask whoever looks
            after the system, then reload this page.
          </p>
        </div>
      ) : (
        (() => {
          const result = queryAuditTrail(entries, {
            ...current,
            page: Number.isNaN(page) ? 1 : page,
          });

          return (
            <div className="flex flex-col gap-8">
              <AuditFilters result={result} current={current} />
              <AuditTrail entries={result.entries} filtered={result.matched !== result.total} />
              <AuditPagination result={result} params={current} />
            </div>
          );
        })()
      )}
    </>
  );
}
