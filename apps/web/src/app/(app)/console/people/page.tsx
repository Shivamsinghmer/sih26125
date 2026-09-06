import { AddPersonPanel } from "@/components/AddPersonPanel";
import { PageHeading } from "@/components/PageHeading";
import { PeopleGrid } from "@/components/PeopleGrid";
import { SeedButton } from "@/components/SeedButton";
import { loadConsoleState } from "@/lib/state";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const state = await loadConsoleState();

  return (
    <>
      <PageHeading title="People">
        Everyone with an identity on this chain. Names and photos live in
        Postgres; only a DID, a public key and a status flag reach the chain.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-slate-gray">
          No chain to read. Deploy the contracts and reload.
        </p>
      ) : (
        <>
          <PeopleGrid personas={state.personas} />

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 className="text-subheading leading-subheading">Onboard someone new</h2>
            <div className="mt-5">
              <AddPersonPanel />
            </div>
          </section>

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 className="text-subheading leading-subheading">Reset to the demo state</h2>
            <p className="mt-1 max-w-[70ch] text-caption leading-caption text-slate-gray">
              Registers the demo identities, issues their credentials and mints one
              asset. Safe to run more than once.
            </p>
            <div className="mt-5">
              <SeedButton />
            </div>
          </section>
        </>
      )}
    </>
  );
}
