import { RecordUnreachable } from "@/components/FormSection";
import { PageHeading } from "@/components/PageHeading";
import { TransferPanel, type AssetOption, type PersonaOption } from "@/components/TransferPanel";
import { loadPeople, personaByAddress } from "@/lib/chain";
import { describeAsset, equipmentByToken, loadEquipment } from "@/lib/equipment";
import { loadConsoleState } from "@/lib/state";

export const dynamic = "force-dynamic";

/**
 * The centrepiece. Everything else in the console sets up the conditions for
 * what happens on this page.
 */
export default async function TransfersPage() {
  const [state, people, equipment] = await Promise.all([
    loadConsoleState(),
    loadPeople(),
    loadEquipment(),
  ]);
  const byToken = equipmentByToken(equipment);

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no clearance",
    })) ?? [];

  const assetOptions: AssetOption[] =
    state?.assets.map((a) => ({
      tokenId: a.tokenId.toString(),
      name: describeAsset(byToken, a)?.name ?? null,
      serial: describeAsset(byToken, a)?.serial ?? null,
      ownerId: personaByAddress(people, a.owner)?.id ?? null,
      requiredRoleLabel: a.requiredRoleLabel,
    })) ?? [];

  return (
    <>
      <PageHeading title="Hand over an item">
        Pass a piece of equipment to somebody else. If they are not cleared to
        hold it, nothing will move and you will be told exactly why &mdash; that
        is the system working, and no account here can override it.
      </PageHeading>

      {!state ? (
        <RecordUnreachable />
      ) : (
        <TransferPanel personas={personaOptions} assets={assetOptions} />
      )}
    </>
  );
}
