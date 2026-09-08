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
        Everyone the system knows about, and what each of them is currently
        cleared for. Names and photos are kept in the staff records here; the
        shared record only ever holds an ID, never anything that names a person.
      </PageHeading>

      {!state ? (
        <p className="text-body leading-body text-label">
          The shared record cannot be reached at the moment. Ask whoever looks
          after the system, then reload this page.
        </p>
      ) : (
        <>
          <PeopleGrid personas={state.personas} />

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 id="onboard" className="scroll-mt-6 text-subheading leading-subheading">Add someone</h2>
            <div className="mt-5">
              <AddPersonPanel />
            </div>
          </section>

          <section className="mt-14 border-t border-mist-gray pt-10">
            <h2 id="reset" className="scroll-mt-6 text-subheading leading-subheading">Load the example data</h2>
            <p className="mt-1 max-w-[70ch] text-caption leading-caption text-label">
              Adds four example people, gives them their clearances and puts one
              piece of equipment on the system. Useful for a demonstration or for
              finding your way around. Safe to press more than once.
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
