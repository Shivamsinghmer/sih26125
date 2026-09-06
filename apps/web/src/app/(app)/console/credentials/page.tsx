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
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no valid role",
    })) ?? [];

  return (
    <>
      <PageHeading title="Credentials">
        Roles are cryptographic facts here, not database rows. Issuing writes a
        grant with an expiry; revoking flips one bit, and every verifier sees it.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-slate-gray">
          No chain to read. Deploy the contracts and reload.
        </p>
      ) : (
        <CredentialsPanel personas={personaOptions} />
      )}
    </>
  );
}
