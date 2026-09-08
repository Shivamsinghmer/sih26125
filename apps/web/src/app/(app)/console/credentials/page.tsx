import { CredentialsPanel } from "@/components/CredentialsPanel";
import { PageHeading } from "@/components/PageHeading";
import { loadConsoleState } from "@/lib/state";
import type { PersonaOption } from "@/components/TransferPanel";

export const dynamic = "force-dynamic";

export default async function CredentialsPage() {
  const state = await loadConsoleState();

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no clearance",
    })) ?? [];

  return (
    <>
      <PageHeading title="Clearances">
        A clearance is what lets somebody hold a particular kind of equipment.
        Every one has an end date, so nothing stays in force by accident — and
        taking one away applies the moment you press the button, everywhere.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-label">
          The shared record cannot be reached at the moment. Ask whoever looks
          after the system, then reload this page.
        </p>
      ) : (
        <CredentialsPanel personas={personaOptions} />
      )}
    </>
  );
}
