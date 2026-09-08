import { personaByAddress, shortAddress, type Persona } from "@/lib/chain";
import { describeAsset, equipmentByToken, type Equipment } from "@/lib/equipment";
import type { AssetState } from "@/lib/state";

/**
 * Equipment and who holds it, shared by the dashboard and the Equipment page.
 *
 * The item column now names the thing. Tokens minted before descriptions were
 * recorded — and any whose description failed to save — fall back to "Item #N"
 * rather than disappearing: the token is real either way, and hiding it would
 * make the register disagree with the chain.
 */
export function AssetsTable({
  assets,
  people,
  equipment = [],
}: {
  assets: AssetState[];
  people: Persona[];
  equipment?: Equipment[];
}) {
  const byToken = equipmentByToken(equipment);

  if (assets.length === 0) {
    return (
      <p className="text-body leading-body text-label">
        No equipment has been added yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-caption leading-caption text-label">
            <th className="pb-3 font-normal">Item</th>
            <th className="pb-3 font-normal">Held by</th>
            <th className="pb-3 font-normal">Needs</th>
            <th className="pb-3 font-normal">Added</th>
          </tr>
        </thead>
        <tbody className="text-body">
          {assets.map((asset) => {
            const holder = personaByAddress(people, asset.owner);
            return (
              <tr key={asset.tokenId.toString()} className="border-t border-mist-gray">
                <td className="py-4">
                  {(() => {
                    const item = describeAsset(byToken, asset);
                    if (!item) {
                      return (
                        <span className="tabular text-label">
                          Item #{asset.tokenId.toString()}
                        </span>
                      );
                    }
                    return (
                      <>
                        <span className="block">{item.name}</span>
                        <span className="mono-addr block text-label">
                          {item.serial} · #{asset.tokenId.toString()}
                        </span>
                      </>
                    );
                  })()}
                </td>
                <td className="py-4">{holder?.name ?? shortAddress(asset.owner)}</td>
                <td className="py-4">{asset.requiredRoleLabel}</td>
                <td className="py-4 tabular text-label">
                  {new Date(asset.mintedAt * 1000).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
