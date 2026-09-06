import { personaByAddress, shortAddress, type Persona } from "@/lib/chain";
import type { AssetState } from "@/lib/state";

/** Assets under custody, shared by the dashboard overview and the Assets page. */
export function AssetsTable({
  assets,
  people,
}: {
  assets: AssetState[];
  people: Persona[];
}) {
  if (assets.length === 0) {
    return (
      <p className="text-body leading-body text-slate-gray">Nothing minted yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-caption leading-caption text-ash-gray">
            <th className="pb-3 font-normal">Asset</th>
            <th className="pb-3 font-normal">Held by</th>
            <th className="pb-3 font-normal">Requires</th>
            <th className="pb-3 font-normal">Minted</th>
          </tr>
        </thead>
        <tbody className="text-body">
          {assets.map((asset) => {
            const holder = personaByAddress(people, asset.owner);
            return (
              <tr key={asset.tokenId.toString()} className="border-t border-mist-gray">
                <td className="py-4 tabular">#{asset.tokenId.toString()}</td>
                <td className="py-4">{holder?.name ?? shortAddress(asset.owner)}</td>
                <td className="py-4">{asset.requiredRoleLabel}</td>
                <td className="py-4 tabular text-slate-gray">
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
