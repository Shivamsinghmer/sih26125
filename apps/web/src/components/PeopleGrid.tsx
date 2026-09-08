import Link from "next/link";

import { shortAddress } from "@/lib/chain";
import type { PersonaState } from "@/lib/state";
import { Card } from "./ui";

/** The people list, shared by the dashboard overview and the People page. */
export function PeopleGrid({ personas }: { personas: PersonaState[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {personas.map((p) => {
        const valid = p.holdings.filter((h) => h.validity === "valid");
        const revoked = p.holdings.filter((h) => h.validity === "revoked");

        return (
          <Card key={p.persona.id} testId="person-card">
            <div className="flex items-center gap-3">
              {p.persona.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.persona.photo}
                  alt=""
                  className="h-11 w-11 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-white text-body text-subtle">
                  {p.persona.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-body-lg leading-body-lg">{p.persona.name}</p>
                <p className="truncate text-caption leading-caption text-label">
                  {p.persona.title}
                </p>
              </div>
            </div>

            <p className="mono-addr mt-3 text-label">
              {shortAddress(p.persona.address)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {valid.length > 0 ? (
                valid.map((h) => (
                  <span
                    key={h.role}
                    className="rounded-full bg-ink-black px-3 py-1 text-[13px] text-paper-white"
                  >
                    {h.label}
                  </span>
                ))
              ) : (
                <span className="text-caption leading-caption text-subtle">
                  No valid credential
                </span>
              )}
              {revoked.map((h) => (
                <span
                  key={h.role}
                  className="rounded-full bg-blush-peach px-3 py-1 text-[13px] text-sienna-brown"
                >
                  {h.label} · revoked
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-caption leading-caption text-subtle">
                {p.registered ? "DID registered on chain" : "Not yet registered"}
              </p>
              {p.registered ? (
                <Link
                  href={`/card/${p.persona.id}`}
                  className="text-caption leading-caption text-ink-black underline underline-offset-2 hover:opacity-70"
                >
                  Print ID card →
                </Link>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
