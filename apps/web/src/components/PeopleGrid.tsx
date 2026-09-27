import { ArrowLink } from "@/components/ArrowLink";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { shortAddress } from "@/lib/chain";
import type { PersonaState } from "@/lib/state";

/**
 * The people list, shared by the dashboard overview and the People page.
 *
 * Each card reads top to bottom in the order a stores officer asks: who is
 * this, what are they cleared for, and can they be checked at a gate. The
 * clearances are the loudest thing on the card because they are the answer the
 * screen exists to give.
 */
export function PeopleGrid({ personas }: { personas: PersonaState[] }) {
  if (personas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-body leading-body">Nobody is on file yet.</p>
        <p className="mt-1 text-caption leading-caption text-subtle">
          Add a person below, or load the example data, and they appear here
          with the clearances they hold.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {personas.map((p) => {
        const valid = p.holdings.filter((h) => h.validity === "valid");
        const revoked = p.holdings.filter((h) => h.validity === "revoked");
        const expired = p.holdings.filter((h) => h.validity === "expired");

        return (
          <Card key={p.persona.id} data-testid="person-card" className="gap-0 py-0">
            <div className="flex items-center gap-4 px-6 pt-6">
              {p.persona.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.persona.photo}
                  alt=""
                  className="size-12 rounded-2xl object-cover ring-1 ring-black/5"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-2xl bg-paper-white font-serif text-body-lg text-subtle ring-1 ring-black/5">
                  {p.persona.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-body-lg leading-tight font-[480]">{p.persona.name}</p>
                <p className="mt-0.5 truncate text-caption leading-caption text-label">
                  {p.persona.title}
                </p>
              </div>
            </div>

            <div className="flex min-h-[4.5rem] flex-wrap content-start gap-2 px-6 pt-5">
              {valid.length > 0 ? (
                valid.map((h) => (
                  <Badge key={h.role} variant="ink">
                    {h.label}
                  </Badge>
                ))
              ) : (
                <Badge variant="tag">No clearance</Badge>
              )}
              {revoked.map((h) => (
                <Badge key={`r-${h.role}`} variant="refusal">
                  {h.label} · taken away
                </Badge>
              ))}
              {expired.map((h) => (
                <Badge key={`e-${h.role}`} variant="refusal">
                  {h.label} · ran out
                </Badge>
              ))}
            </div>

            {/* Their ID on the shared record. Nobody needs to read it, but it
                is what a gate check matches against, so it is shown rather
                than hidden — small, and never in place of their name. */}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/[0.06] px-6 py-4">
              <p className="mono-addr text-[12.5px] text-label" title={p.persona.address}>
                {p.registered ? shortAddress(p.persona.address) : "No digital ID yet"}
              </p>
              {p.registered ? (
                <ArrowLink href={`/card/${p.persona.id}`}>Print ID card</ArrowLink>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
