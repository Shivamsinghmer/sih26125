import Link from "next/link";

import { AddPersonPanel } from "@/components/AddPersonPanel";
import { AdminPanel } from "@/components/AdminPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { SeedButton } from "@/components/SeedButton";
import { TransferPanel, type AssetOption, type PersonaOption } from "@/components/TransferPanel";
import { AppHeader } from "@/components/AppHeader";
import { Card, Section } from "@/components/ui";
import { loadPeople, personaByAddress, shortAddress } from "@/lib/chain";
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
pnpm --filter @sih26125/contracts deploy:local`}
      </pre>
    </Card>
  );
}

export default async function ConsolePage() {
  const [state, auditTrail, people] = await Promise.all([
    loadConsoleState(),
    loadAuditTrail(),
    loadPeople(),
  ]);

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel:
        p.holdings.find((h) => h.validity === "valid")?.label ?? "no valid role",
    })) ?? [];

  const assetOptions: AssetOption[] =
    state?.assets.map((a) => ({
      tokenId: a.tokenId.toString(),
      ownerId: personaByAddress(people, a.owner)?.id ?? null,
      requiredRoleLabel: a.requiredRoleLabel,
    })) ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-6 pb-32 pt-10">
      <AppHeader
        chainNote={
          state
            ? `chain ${state.deployment.chainId} · AssetToken ${shortAddress(
                state.deployment.contracts.AssetToken,
              )}`
            : undefined
        }
      />

      <h1 className="display-serif mt-16 max-w-[16ch] text-heading-lg leading-heading-lg tracking-heading-lg">
        Ownership, permission and history become one cryptographic object.
      </h1>
      <p className="mt-6 max-w-[62ch] text-body-lg leading-body-lg text-slate-gray">
        An asset token that refuses to move unless the receiver holds a valid role
        credential. The check runs inside the contract, so no interface — including
        this one — can wave it through.
      </p>

      {!state ? (
        <div className="mt-16">
          <NotDeployed />
        </div>
      ) : (
        <>
          <Section eyebrow="Step 1" title="People and their credentials">
            <div className="grid gap-4 md:grid-cols-3">
              {state.personas.map((p) => {
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist-gray text-body text-smoke-gray">
                          {p.persona.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-body-lg leading-body-lg">{p.persona.name}</p>
                        <p className="text-caption leading-caption text-slate-gray">
                          {p.persona.title}
                        </p>
                      </div>
                    </div>
                    <p className="mono-addr mt-3 text-ash-gray">
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
                        <span className="text-caption leading-caption text-smoke-gray">
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
                      <p className="text-caption leading-caption text-smoke-gray">
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
            <div className="mt-10 border-t border-mist-gray pt-8">
              <h3 className="text-subheading leading-subheading">Onboard someone new</h3>
              <div className="mt-5">
                <AddPersonPanel />
              </div>
            </div>

            <div className="mt-10 border-t border-mist-gray pt-8">
              <h3 className="text-subheading leading-subheading">Reset to the demo state</h3>
              <p className="mt-1 max-w-[70ch] text-caption leading-caption text-slate-gray">
                Registers the three demo identities, issues their credentials and
                mints one asset. Safe to run more than once.
              </p>
              <div className="mt-5">
                <SeedButton />
              </div>
            </div>
          </Section>

          <Section eyebrow="Step 2" title="Assets under custody">
            {state.assets.length === 0 ? (
              <p className="text-body leading-body text-slate-gray">
                Nothing minted yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-caption leading-caption text-ash-gray">
                      <th className="pb-3 font-normal">Asset</th>
                      <th className="pb-3 font-normal">Held by</th>
                      <th className="pb-3 font-normal">Requires</th>
                      <th className="pb-3 font-normal">Minted</th>
                    </tr>
                  </thead>
                  <tbody className="text-body">
                    {state.assets.map((asset) => {
                      const holder = personaByAddress(people, asset.owner);
                      return (
                        <tr key={asset.tokenId.toString()} className="border-t border-mist-gray">
                          <td className="py-4 tabular">#{asset.tokenId.toString()}</td>
                          <td className="py-4">
                            {holder?.name ?? shortAddress(asset.owner)}
                          </td>
                          <td className="py-4">{asset.requiredRoleLabel}</td>
                          <td className="py-4 text-slate-gray tabular">
                            {new Date(asset.mintedAt * 1000).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section eyebrow="Step 3" title="Move an asset">
            <TransferPanel personas={personaOptions} assets={assetOptions} />
          </Section>

          <Section eyebrow="Step 4" title="Issue, revoke, mint">
            <AdminPanel personas={personaOptions} />
          </Section>

          <Section eyebrow="Step 5" title="Replay the whole history">
            <AuditTrail entries={auditTrail ?? []} />
          </Section>
        </>
      )}
    </main>
  );
}
