/**
 * Seed a freshly deployed chain with the demo's opening state, from a terminal.
 *
 *   bun run scripts/seed.ts
 *
 * Same state the console's "Seed the demo" button produces — three registered
 * identities, their credentials, and one asset — so the demo can be set up
 * without a browser.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import { Role, didFromAddress } from "@sih26125/identity";

import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import IdentityRegistryArtifact from "../../contracts/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const DAY = 86_400;

const PEOPLE = [
  {
    key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    name: "S. Raghavan",
    role: Role.Admin,
  },
  {
    key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    name: "Priya Menon",
    role: Role.Manager,
  },
  {
    key: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    name: "Rahul Nair",
    role: Role.User,
  },
] as const;

const admin = privateKeyToAccount(PEOPLE[0].key as Hex);
const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
const adminWallet = createWalletClient({ account: admin, chain: hardhat, transport: http(RPC_URL) });

const deployment = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../deployments/localhost.json", import.meta.url)),
    "utf8",
  ),
) as {
  chainId: number;
  contracts: { IdentityRegistry: Address; RoleRegistry: Address; AssetToken: Address };
};

async function send(address: Address, abi: unknown, functionName: string, args: unknown[]) {
  const hash = await adminWallet.writeContract({
    address,
    abi: abi as never,
    functionName,
    args: args as never,
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

const latest = await publicClient.getBlock();
const expiry = BigInt(Number(latest.timestamp) + 30 * DAY);

for (const person of PEOPLE) {
  const account = privateKeyToAccount(person.key as Hex);
  const did = didFromAddress(account.address, deployment.chainId);

  try {
    await send(deployment.contracts.IdentityRegistry, IdentityRegistryArtifact.abi, "register", [
      account.address,
      did,
    ]);
  } catch {
    // Already registered; seeding is re-runnable.
  }

  await send(deployment.contracts.RoleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
    account.address,
    person.role,
    expiry,
  ]);

  console.log(`✓ ${person.name} — identity registered, granted ${Role[person.role]}`);
}

const priya = privateKeyToAccount(PEOPLE[1].key as Hex);
await send(deployment.contracts.AssetToken, AssetTokenArtifact.abi, "mint", [
  priya.address,
  Role.Manager,
  `0x${"a3".repeat(32)}`,
]);
console.log("✓ Signal Analyser SN-8823 minted as asset #1 to Priya Menon");
