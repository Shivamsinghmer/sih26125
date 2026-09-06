import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { hardhat } from "viem/chains";

import { Role } from "@sih26125/identity";

import { accountFor, type Persona } from "./people";

/**
 * Server-side chain access for the console.
 *
 * Signing happens here rather than through a browser wallet. That is a demo
 * decision, not an architectural one: MetaMask on a venue laptop means network
 * switching, account switching and an extension popup between the judge and the
 * point being made. The enforcement being demonstrated is on chain either way —
 * `AssetToken._update` does not care which client signed the transaction, which
 * is the entire claim. Production identities would be smart accounts with
 * guardian recovery; see GuardianRecovery.
 *
 * Keys are derived from an HD seed by index rather than stored — see people.ts.
 */

export type { Persona } from "./people";
export {
  accountFor,
  addPerson,
  loadPeople,
  personaByAddress,
  personaById,
  privateKeyFor,
} from "./people";

export const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(RPC_URL),
});

export function walletFor(persona: Persona) {
  return createWalletClient({
    account: accountFor(persona),
    chain: hardhat,
    transport: http(RPC_URL),
  });
}

export interface Deployment {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: Address;
  contracts: {
    IdentityRegistry: Address;
    RoleRegistry: Address;
    AssetToken: Address;
    CredentialStatus?: Address;
    GuardianRecovery?: Address;
  };
}

/**
 * Read the addresses written by `pnpm --filter @sih26125/contracts deploy:local`.
 * Returns null rather than throwing so the UI can explain what to run instead of
 * showing a stack trace.
 */
export function readDeployment(): Deployment | null {
  const path = resolve(process.cwd(), "../../deployments/localhost.json");
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Deployment;
  } catch {
    return null;
  }
}

/** Roles offered in the console, in the order the problem statement names them. */
export const ASSIGNABLE_ROLES = [
  Role.Admin,
  Role.Manager,
  Role.Auditor,
  Role.User,
] as const;

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
