import { PageHeading } from "@/components/PageHeading";
import { TransferPanel, type AssetOption, type PersonaOption } from "@/components/TransferPanel";
import { loadPeople, personaByAddress } from "@/lib/chain";
import { loadConsoleState } from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * The centrepiece. Everything else in the console sets up the conditions for
 * what happens on this page.
 */
export default async function TransfersPage() {
  const [state, people] = await Promise.all([loadConsoleState(), loadPeople()]);

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no valid role",
    })) ?? [];

  const assetOptions: AssetOption[] =
    state?.assets.map((a) => ({
      tokenId: a.tokenId.toString(),
      ownerId: personaByAddress(people, a.owner)?.id ?? null,
      requiredRoleLabel: a.requiredRoleLabel,
    })) ?? [];

  return (
    <>
      <PageHeading title="Move an asset">
        A transfer to someone without a valid credential does not fail politely
        here — it reverts inside the contract. The same call from a script fails
        identically.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-slate-gray">
          No chain to read. Deploy the contracts and reload.
        </p>
      ) : (
        <TransferPanel personas={personaOptions} assets={assetOptions} />
      )}
    </>
  );
}
