import Link from "next/link";

import type { AuditPage } from "@/lib/audit";

/** Page links that carry the active filters, so paging never silently resets them. */
export function AuditPagination({
  result,
  params,
}: {
  result: AuditPage;
  params: { contract: string; event: string; q: string };
}) {
  if (result.pageCount <= 1) return null;

  const href = (page: number) => {
    const search = new URLSearchParams();
    if (params.contract !== "all") search.set("contract", params.contract);
    if (params.event !== "all") search.set("event", params.event);
    if (params.q) search.set("q", params.q);
    if (page > 1) search.set("page", String(page));
    const qs = search.toString();
    return qs ? `/audit?${qs}` : "/audit";
  };

  const previous = result.page > 1 ? result.page - 1 : null;
  const next = result.page < result.pageCount ? result.page + 1 : null;

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-mist-gray pt-5">
      {previous ? (
        <Link
          href={href(previous)}
          className="rounded-full border border-mist-gray px-4 py-2 text-caption leading-caption text-label hover:border-ink-black hover:text-ink-black"
        >
          ← Newer
        </Link>
      ) : (
        <span className="text-caption leading-caption text-subtle">← Newer</span>
      )}

      <span className="text-caption leading-caption text-label">
        Page {result.page} of {result.pageCount}
      </span>

      {next ? (
        <Link
          href={href(next)}
          className="rounded-full border border-mist-gray px-4 py-2 text-caption leading-caption text-label hover:border-ink-black hover:text-ink-black"
        >
          Older →
        </Link>
      ) : (
        <span className="text-caption leading-caption text-subtle">Older →</span>
      )}
    </nav>
  );
}
