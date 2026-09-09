import { keccak256, toHex, type Address } from "viem";

import { roleRegistryAbi } from "@sih26125/chain";

import type { ConsoleRole } from "./auth-types";
import { publicClient, readDeployment } from "./chain";

/**
 * What this address may open, according to the chain.
 *
 * The console role is *derived*, never stored. Revoking someone's authority on
 * chain also takes away their console — there is no second place to remember to
 * update, which is the entire argument the project makes about permissions
 * elsewhere, applied to the application's own front door.
 *
 * It reads AccessControl roles, not clearance levels, and that distinction is
 * the point. Clearance says what you may *hold*; authority says what you may
 * *do*. They are genuinely independent: an officer authorised to sign gate
 * passes is a named delegation from the CEO under the Security Manual for
 * Licensed Defence Industries para 4.5, not a consequence of being cleared to
 * Secret. This used to check the business-role enum for Admin and Auditor,
 * which meant the top clearance silently carried administrative power with it.
 */

const ISSUER_ROLE = keccak256(toHex("ISSUER_ROLE"));
const AUDITOR_ROLE = keccak256(toHex("AUDITOR_ROLE"));

export async function consoleRoleForAddress(
  address: Address,
): Promise<ConsoleRole | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  const holds = async (role: `0x${string}`): Promise<boolean> =>
    (await publicClient.readContract({
      address: deployment.contracts.RoleRegistry,
      abi: roleRegistryAbi,
      functionName: "hasRole",
      args: [role, address],
    })) as boolean;

  // Issuing authority first: it is the broader of the two, and someone who can
  // issue can also inspect.
  if (await holds(ISSUER_ROLE)) return "admin";
  if (await holds(AUDITOR_ROLE)) return "auditor";
  return null;
}
