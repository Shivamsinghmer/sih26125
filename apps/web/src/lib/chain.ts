import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import { Role } from "@sih26125/identity";

/**
 * Server-side chain access for the console.
 *
 * Signing happens here rather than through a browser wallet. That is a demo
 * decision, not an architectural one: MetaMask on a venue laptop means network
 * switching, account switching and an extension popup between the judge and the
 * point being made. The enforcement being demonstrated is on chain either way —
 * `AssetToken._update` does not care which client signed the transaction, which
 * is the entire claim. Production identities would be smart accounts with
 * guardian recovery; see GuardianRecovery in the Phase 5 plan.
 *
 * These are Hardhat's published development keys. They control nothing off a
 * local chain.
 */
export interface Persona {
  id: string;
  name: string;
  title: string;
  privateKey: Hex;
  address: Address;
}

const RAW_PERSONAS = [
  {
    id: "admin",
    name: "S. Raghavan",
    title: "Issuing Authority, IT Security",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    id: "manager",
    name: "Priya Menon",
    title: "Divisional Manager, Radar Systems",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    id: "user",
    name: "Rahul Nair",
    title: "Technician, Radar Systems",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
] as const;

export const PERSONAS: Persona[] = RAW_PERSONAS.map((p) => ({
  ...p,
  privateKey: p.privateKey as Hex,
  address: privateKeyToAccount(p.privateKey as Hex).address,
}));

export function personaById(id: string): Persona {
  const found = PERSONAS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown persona: ${id}`);
  return found;
}

export function personaByAddress(address: string): Persona | undefined {
  return PERSONAS.find((p) => p.address.toLowerCase() === address.toLowerCase());
}

export const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(RPC_URL),
});

export function walletFor(persona: Persona) {
  return createWalletClient({
    account: privateKeyToAccount(persona.privateKey),
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
