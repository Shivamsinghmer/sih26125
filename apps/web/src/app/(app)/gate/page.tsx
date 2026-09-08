import { PageHeading } from "@/components/PageHeading";
import { GateCheck } from "@/components/GateCheck";
import { didFromAddress } from "@sih26125/identity";
import { loadPeople, readDeployment } from "@/lib/chain";

export const dynamic = "force-dynamic";

export default async function GatePage() {
  const deployment = readDeployment();
  const people = deployment ? await loadPeople() : [];

  // Stand-ins for a hardware scanner, so this is demonstrable without one.
  const presets = people
    .slice(0, 4)
    .map((p) => ({
      label: p.name,
      did: didFromAddress(p.address, deployment?.chainId ?? 31337),
    }));

  return (
    <>
      <PageHeading title="Gate check">
        Two checks happen at a gate, and only one of them is this screen. First
        look at the person and compare them to the photo on their card &mdash;
        that part is yours. Then scan the code on the card, and this will tell
        you whether their clearance is valid at this moment.
      </PageHeading>

      {!deployment ? (
        <div className="rounded-3xl bg-mist-gray px-8 py-7">
          <p className="text-body leading-body">
            The shared record cannot be reached, so no check can be trusted right
            now. Do not wave anybody through on this screen&rsquo;s say-so &mdash;
            call the issuing authority.
          </p>
        </div>
      ) : (
        <GateCheck presets={presets} />
      )}
    </>
  );
}
