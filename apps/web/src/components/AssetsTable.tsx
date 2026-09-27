import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-body leading-body">No equipment has been added yet.</p>
        <p className="mt-1 text-caption leading-caption text-subtle">
          Register a piece on the Equipment page and it appears here with its
          holder and the clearance it needs.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Item</TableHead>
          <TableHead>Held by</TableHead>
          <TableHead>Needs</TableHead>
          <TableHead className="text-right">Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => {
          const holder = personaByAddress(people, asset.owner);
          const item = describeAsset(byToken, asset);
          return (
            <TableRow key={asset.tokenId.toString()}>
              <TableCell>
                {item ? (
                  <>
                    <span className="block">{item.name}</span>
                    <span className="mono-addr mt-0.5 block text-label">
                      {item.serial} · #{asset.tokenId.toString()}
                    </span>
                  </>
                ) : (
                  <span className="text-label">Item #{asset.tokenId.toString()}</span>
                )}
              </TableCell>
              <TableCell>
                {holder ? (
                  holder.name
                ) : (
                  <span className="mono-addr text-label">{shortAddress(asset.owner)}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{asset.requiredRoleLabel}</Badge>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap text-label">
                {new Date(asset.mintedAt * 1000).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
