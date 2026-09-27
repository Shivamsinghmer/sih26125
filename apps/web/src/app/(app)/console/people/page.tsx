import { AddPersonPanel } from "@/components/AddPersonPanel";
import { FormSection, RecordUnreachable } from "@/components/FormSection";
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
        <RecordUnreachable />
      ) : (
        <>
          <PeopleGrid personas={state.personas} />

          <FormSection
            id="onboard"
            title="Add someone"
            description={
              <>
                Their name, job title and photo are kept in the staff records
                here. What goes onto the shared record is only an ID &mdash;
                nothing that names them &mdash; which is what lets their details
                be deleted later if they ask. The photo is used for printing
                their ID card; the gate does not look it up.
              </>
            }
          >
            <AddPersonPanel />
          </FormSection>

          <FormSection
            id="reset"
            title="Load the example data"
            description="Adds four example people, gives them their clearances and puts one piece of equipment on the system. Useful for a demonstration or for finding your way around. Safe to press more than once."
          >
            <SeedButton />
          </FormSection>
        </>
      )}
    </>
  );
}
