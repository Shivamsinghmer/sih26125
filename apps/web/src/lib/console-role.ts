import type { Address } from "viem";

import { roleRegistryAbi } from "@sih26125/chain";
import { Role } from "@sih26125/identity";

import type { ConsoleRole } from "./auth-types";
import { publicClient, readDeployment } from "./chain";

/**
 * What this address may open, according to the chain.
 *
 * The console role is *derived*, never stored. Revoking someone's Admin
 * credential on chain also takes away their console — there is no second place
 * to remember to update, which is the entire argument the project makes about
 * permissions elsewhere, applied to the application's own front door.
 *
 * Manager and User map to nothing here on purpose: they hold cards, they do not
 * administer the system.
 */
export async function consoleRoleForAddress(
  address: Address,
): Promise<ConsoleRole | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  const check = async (role: Role): Promise<boolean> => {
    const [valid] = (await publicClient.readContract({
      address: deployment.contracts.RoleRegistry,
      abi: roleRegistryAbi,
      functionName: "checkRole",
      args: [address, role],
    })) as [boolean, number, bigint];
    return valid;
  };

  if (await check(Role.Admin)) return "admin";
  if (await check(Role.Auditor)) return "auditor";
  return null;
}
