import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
} from "viem";

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
  nextAddressIndex,
  personaByAddress,
  personaById,
  removePerson,
  privateKeyFor,
} from "./people";

export const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

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
 * Where the contract addresses come from.
 *
 * Locally they come from the file `pnpm --filter @sih26125/contracts deploy:local`
 * writes, which is why a fresh clone needs no configuration at all. That file is
 * per-machine and git-ignored, so it is never inside a container image or a
 * hosted build, and three overrides cover the ways a deployment supplies it:
 *
 *   - `DEPLOYMENT_JSON` — the contents inline, for a platform whose only unit of
 *     configuration is an environment variable. Vercel.
 *   - `DEPLOYMENT_FILE` — an absolute path, for a container with the file
 *     mounted in. Docker.
 *   - `DEPLOYMENT_NETWORK` — picks between the files a developer keeps side by
 *     side (`localhost.json`, `besu.json`), which is how running the console
 *     against Besu stops needing a code edit.
 *
 * Returns null rather than throwing so the UI can explain what to run instead of
 * showing a stack trace.
 */
let deploymentCache: Deployment | null | undefined;

export function readDeployment(): Deployment | null {
  if (deploymentCache !== undefined) return deploymentCache;
  deploymentCache = loadDeployment();
  return deploymentCache;
}

function loadDeployment(): Deployment | null {
  const inline = process.env.DEPLOYMENT_JSON;
  if (inline) {
    try {
      return JSON.parse(inline) as Deployment;
    } catch {
      // A malformed variable is a deployment mistake, not a missing chain, and
      // silently falling through to the file would hide it on a machine where
      // that file happens to exist.
      throw new Error("DEPLOYMENT_JSON is set but is not valid JSON");
    }
  }

  const network = process.env.DEPLOYMENT_NETWORK ?? "localhost";
  const path =
    process.env.DEPLOYMENT_FILE ??
    resolve(process.cwd(), `../../deployments/${network}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Deployment;
  } catch {
    return null;
  }
}

/**
 * The chain the clients talk to.
 *
 * Taken from the deployment rather than hardcoded: a transaction is signed for a
 * specific chain id, so signing for 31337 and sending to Besu's 26125 produces a
 * transaction every node rejects. Falling back to Hardhat's id keeps the local
 * default working when no deployment has been made yet.
 */
const deployment = readDeployment();

export const chain = defineChain({
  id: deployment?.chainId ?? 31337,
  name: deployment?.network ?? "localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

export function walletFor(persona: Persona) {
  return createWalletClient({
    account: accountFor(persona),
    chain,
    transport: http(RPC_URL),
  });
}

/** Roles offered in the console, in the order the problem statement names them. */
export const ASSIGNABLE_ROLES = [
  Role.TopSecret,
  Role.Secret,
  Role.Confidential,
  Role.Restricted,
] as const;

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
