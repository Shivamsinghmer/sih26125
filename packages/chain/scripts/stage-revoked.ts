/**
 * Stage the offboarding scenario against an already-deployed chain, so the
 * revoked-credential path can be exercised in the console.
 *
 *   bun run scripts/stage-revoked.ts
 *
 * Leaves the chain with: Rahul holding asset #1 under a valid Manager
 * credential, and Priya's Manager credential revoked — so a transfer back to
 * Priya is blocked for "revoked" rather than "never granted".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import { Role } from "@sih26125/identity";

import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

const KEYS = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  priya: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  rahul: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
} as const;

const admin = privateKeyToAccount(KEYS.admin as Hex);
const priya = privateKeyToAccount(KEYS.priya as Hex);
const rahul = privateKeyToAccount(KEYS.rahul as Hex);

const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
const wallet = (account: typeof admin) =>
  createWalletClient({ account, chain: hardhat, transport: http(RPC_URL) });

const deployment = JSON.parse(
  readFileSync(
    // `import.meta.dir` is Bun-only; this resolves the same path under both runtimes.
    fileURLToPath(new URL("../../../deployments/localhost.json", import.meta.url)),
    "utf8",
  ),
) as { contracts: { RoleRegistry: Address; AssetToken: Address } };

async function send(
  account: typeof admin,
  address: Address,
  abi: unknown,
  functionName: string,
  args: unknown[],
) {
  const hash = await wallet(account).writeContract({
    address,
    abi: abi as never,
    functionName,
    args: args as never,
  });
  return publicClient.waitForTransactionReceipt({ hash });
}

const expiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 86_400);

await send(admin, deployment.contracts.RoleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
  rahul.address,
  Role.Secret,
  expiry,
]);
console.log("✓ Rahul granted Manager");

await send(priya, deployment.contracts.AssetToken, AssetTokenArtifact.abi, "transferFrom", [
  priya.address,
  rahul.address,
  1n,
]);
console.log("✓ Asset #1 transferred Priya → Rahul (the allowed case)");

await send(admin, deployment.contracts.RoleRegistry, RoleRegistryArtifact.abi, "revokeBusinessRole", [
  priya.address,
  Role.Secret,
]);
console.log("✓ Priya's Manager credential revoked");

console.log("\nNow attempt asset #1 from Rahul Nair → Priya Menon in the console.");
