import { AdminPanel } from "@/components/AdminPanel";
import { SeedButton } from "@/components/SeedButton";
import { TransferPanel, type AssetOption, type PersonaOption } from "@/components/TransferPanel";
import { Card, Section } from "@/components/ui";
import { personaByAddress, shortAddress } from "@/lib/chain";
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
  const state = await loadConsoleState();

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
      ownerId: personaByAddress(a.owner)?.id ?? null,
      requiredRoleLabel: a.requiredRoleLabel,
    })) ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-6 pb-32 pt-16">
      <header className="flex items-baseline justify-between gap-6">
        <p className="text-caption leading-caption">
          <span className="text-ink-black">BEL Asset Custody</span>
          <span className="text-ash-gray"> · SIH26125</span>
        </p>
        {state ? (
          <p className="mono-addr text-slate-gray">
            chain {state.deployment.chainId} · AssetToken{" "}
            {shortAddress(state.deployment.contracts.AssetToken)}
          </p>
        ) : null}
      </header>

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
                  <Card key={p.persona.id}>
                    <p className="text-body-lg leading-body-lg">{p.persona.name}</p>
                    <p className="mt-1 text-caption leading-caption text-slate-gray">
                      {p.persona.title}
                    </p>
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
                    <p className="mt-4 text-caption leading-caption text-smoke-gray">
                      {p.registered ? "DID registered on chain" : "Not yet registered"}
                    </p>
                  </Card>
                );
              })}
            </div>
            <div className="mt-8">
              <SeedButton />
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
                      const holder = personaByAddress(asset.owner);
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
        </>
      )}
    </main>
  );
}
