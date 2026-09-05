import type { Address } from "viem";

import { assetTokenAbi, identityRegistryAbi, roleRegistryAbi } from "@sih26125/chain";
import { Role, roleName } from "@sih26125/identity";

import {
  PERSONAS,
  publicClient,
  readDeployment,
  type Deployment,
  type Persona,
} from "./chain";

export type RoleValidity = "valid" | "never-granted" | "revoked" | "expired";

const REASON_BY_INDEX: RoleValidity[] = ["valid", "never-granted", "revoked", "expired"];

export interface RoleHolding {
  role: Role;
  label: string;
  validity: RoleValidity;
  expiry: number;
}

export interface PersonaState {
  persona: Persona;
  registered: boolean;
  did: string | null;
  holdings: RoleHolding[];
  /** The strongest currently-valid role, for the summary line. */
  effectiveRole: Role;
}

export interface AssetState {
  tokenId: bigint;
  owner: Address;
  requiredRole: Role;
  requiredRoleLabel: string;
  mintedAt: number;
  metadataHash: string;
}

export interface ConsoleState {
  deployment: Deployment;
  personas: PersonaState[];
  assets: AssetState[];
}

const ALL_ROLES = [Role.Admin, Role.Manager, Role.Auditor, Role.User] as const;

async function loadPersona(
  persona: Persona,
  deployment: Deployment,
): Promise<PersonaState> {
  const identity = (await publicClient.readContract({
    address: deployment.contracts.IdentityRegistry,
    abi: identityRegistryAbi,
    functionName: "get",
    args: [persona.address],
  })) as { did: string; status: number; registeredAt: bigint };

  const holdings = await Promise.all(
    ALL_ROLES.map(async (role): Promise<RoleHolding> => {
      const [, reasonIndex, expiry] = (await publicClient.readContract({
        address: deployment.contracts.RoleRegistry,
        abi: roleRegistryAbi,
        functionName: "checkRole",
        args: [persona.address, role],
      })) as [boolean, number, bigint];

      return {
        role,
        label: roleName(role),
        validity: REASON_BY_INDEX[Number(reasonIndex)] ?? "never-granted",
        expiry: Number(expiry),
      };
    }),
  );

  const effective =
    holdings.find((h) => h.validity === "valid")?.role ?? Role.None;

  return {
    persona,
    registered: Number(identity.status) !== 0,
    did: identity.did || null,
    holdings,
    effectiveRole: effective,
  };
}

async function loadAssets(deployment: Deployment): Promise<AssetState[]> {
  const logs = await publicClient.getContractEvents({
    address: deployment.contracts.AssetToken,
    abi: assetTokenAbi,
    eventName: "AssetMinted",
    fromBlock: 0n,
    toBlock: "latest",
  });

  const assets = await Promise.all(
    logs.map(async (log) => {
      // ABIs are loaded from JSON artifacts rather than `as const`, so viem
      // cannot infer event argument types here.
      const args =
        (log as unknown as {
          args?: { tokenId?: bigint; requiredRole?: number; metadataHash?: string };
        }).args ?? {};
      const tokenId = args.tokenId ?? 0n;

      const owner = (await publicClient.readContract({
        address: deployment.contracts.AssetToken,
        abi: assetTokenAbi,
        functionName: "ownerOf",
        args: [tokenId],
      })) as Address;

      const info = (await publicClient.readContract({
        address: deployment.contracts.AssetToken,
        abi: assetTokenAbi,
        functionName: "assets",
        args: [tokenId],
      })) as [number, string, bigint];

      const requiredRole = Number(info[0]) as Role;

      return {
        tokenId,
        owner,
        requiredRole,
        requiredRoleLabel: roleName(requiredRole),
        mintedAt: Number(info[2]),
        metadataHash: info[1],
      };
    }),
  );

  return assets.sort((a, b) => Number(a.tokenId - b.tokenId));
}

/** Read everything the console renders. Returns null when nothing is deployed yet. */
export async function loadConsoleState(): Promise<ConsoleState | null> {
  const deployment = readDeployment();
  if (!deployment) return null;

  try {
    const [personas, assets] = await Promise.all([
      Promise.all(PERSONAS.map((p) => loadPersona(p, deployment))),
      loadAssets(deployment),
    ]);
    return { deployment, personas, assets };
  } catch {
    // Addresses on file but no chain answering, or a stale deployment file.
    return null;
  }
}
