import Link from "next/link";

import type { AuditPage } from "@/lib/audit";
import { Button, buttonVariants } from "@/components/ui/button";

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
    <nav aria-label="History pages" className="flex items-center justify-between gap-4">
      {previous ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={href(previous)}>← Newer</Link>
        </Button>
      ) : (
        <span aria-disabled className={buttonVariants({ variant: "ghost", size: "sm" }) + " opacity-35"}>
          ← Newer
        </span>
      )}

      <span className="tabular text-caption leading-caption text-label">
        Page {result.page} of {result.pageCount}
      </span>

      {next ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={href(next)}>Older →</Link>
        </Button>
      ) : (
        <span aria-disabled className={buttonVariants({ variant: "ghost", size: "sm" }) + " opacity-35"}>
          Older →
        </span>
      )}
    </nav>
  );
}
