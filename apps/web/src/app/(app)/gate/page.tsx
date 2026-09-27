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
        // Fail closed, and look it: this is a refusal to vouch for anyone, so it
        // wears the refusal pair rather than a neutral "offline" grey that a
        // guard under pressure could read as "nothing wrong".
        <div role="alert" className="rounded-3xl bg-blush-peach px-7 py-7 text-sienna-brown md:px-9">
          <p className="display-serif text-[clamp(26px,2.6vw,32px)] leading-[1.15] tracking-[-0.015em]">
            No check can be trusted right now
          </p>
          <p className="mt-3 max-w-[60ch] text-body-lg leading-[1.45]">
            The shared record cannot be reached. Do not wave anybody through on
            this screen&rsquo;s say-so &mdash; call the issuing authority.
          </p>
        </div>
      ) : (
        <GateCheck presets={presets} />
      )}
    </>
  );
}
