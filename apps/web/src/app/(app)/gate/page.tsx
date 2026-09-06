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
        Two checks happen at a gate, and only one of them is this screen. Compare
        the person to the photo printed on their card — that part is human. Then
        scan the card&rsquo;s QR to ask the chain whether their credential is
        still valid right now.
      </PageHeading>

      {!deployment ? (
        <div className="rounded-3xl bg-mist-gray px-8 py-7">
          <p className="text-body leading-body">
            No chain to check against. Deploy the contracts and reload.
          </p>
        </div>
      ) : (
        <GateCheck presets={presets} />
      )}
    </>
  );
}
