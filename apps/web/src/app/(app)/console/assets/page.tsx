import { AssetsTable } from "@/components/AssetsTable";
import { MintPanel } from "@/components/MintPanel";
import { PageHeading } from "@/components/PageHeading";
import { loadPeople } from "@/lib/chain";
import { loadEquipment } from "@/lib/equipment";
import { loadConsoleState } from "@/lib/state";
import type { PersonaOption } from "@/components/TransferPanel";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [state, people, equipment] = await Promise.all([
    loadConsoleState(),
    loadPeople(),
    loadEquipment(),
  ]);

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no clearance",
    })) ?? [];

  return (
    <>
      <PageHeading title="Equipment">
        Every item on the system, and who is holding it. Each item is held by
        exactly one person at a time, and carries the clearance anybody needs
        before it can be handed to them.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-label">
          The shared record cannot be reached at the moment. Ask whoever looks
          after the system, then reload this page.
        </p>
      ) : (
        <>
          <AssetsTable assets={state.assets} people={people} equipment={equipment} />

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 id="register" className="scroll-mt-6 text-subheading leading-subheading">Add equipment</h2>
            <p className="mt-1 max-w-[70ch] text-caption leading-caption text-label">
              Choose who holds it first, and the clearance it will require from
              then on. Only the issuing authority can add equipment, and that is
              decided by the shared record rather than by this form.
            </p>
            <div className="mt-5">
              <MintPanel personas={personaOptions} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
