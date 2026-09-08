import { AssetsTable } from "@/components/AssetsTable";
import { MintPanel } from "@/components/MintPanel";
import { PageHeading } from "@/components/PageHeading";
import { loadPeople } from "@/lib/chain";
import { loadConsoleState } from "@/lib/state";
import type { PersonaOption } from "@/components/TransferPanel";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const [state, people] = await Promise.all([loadConsoleState(), loadPeople()]);

  const personaOptions: PersonaOption[] =
    state?.personas.map((p) => ({
      id: p.persona.id,
      name: p.persona.name,
      roleLabel: p.holdings.find((h) => h.validity === "valid")?.label ?? "no valid role",
    })) ?? [];

  return (
    <>
      <PageHeading title="Assets">
        Each item is an ERC-721 bound to a holder&rsquo;s DID. The role chosen at
        mint is what any future holder must present to receive it.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-label">
          No chain to read. Deploy the contracts and reload.
        </p>
      ) : (
        <>
          <AssetsTable assets={state.assets} people={people} />

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 className="text-subheading leading-subheading">Register an asset</h2>
            <p className="mt-1 max-w-[70ch] text-caption leading-caption text-label">
              Only an account holding the issuer role can mint — enforced by the
              contract, not by this form.
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
