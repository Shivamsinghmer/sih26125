/**
 * Prove the system behaves identically on the real deployment target.
 *
 *   docker compose -f infra/besu/docker-compose.yml up -d
 *   pnpm --filter @sih26125/contracts hardhat run scripts/deploy.ts --network besu
 *   bun run scripts/verify-besu.ts
 *
 * Same contracts, same bytecode, different chain. If the credential gate holds
 * here it holds in the deployment, and "Besu is our target" stops being a slide.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { Role, didFromAddress } from "@sih26125/identity";

import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import IdentityRegistryArtifact from "../../contracts/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";
import { explainContractError } from "../src/errors.js";

const RPC_URL = process.env.BESU_RPC_URL ?? "http://127.0.0.1:8545";

const deployment = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../deployments/besu.json", import.meta.url)),
    "utf8",
  ),
) as {
  chainId: number;
  contracts: { IdentityRegistry: Address; RoleRegistry: Address; AssetToken: Address };
};

const besu = defineChain({
  id: deployment.chainId,
  name: "BEL Besu QBFT",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const KEYS = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  priya: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  rahul: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
} as const;

const admin = privateKeyToAccount(KEYS.admin as Hex);
const priya = privateKeyToAccount(KEYS.priya as Hex);
const rahul = privateKeyToAccount(KEYS.rahul as Hex);

const publicClient = createPublicClient({ chain: besu, transport: http(RPC_URL) });
const wallet = (account: typeof admin) =>
  createWalletClient({ account, chain: besu, transport: http(RPC_URL) });

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
    gas: 3_000_000n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // An explicit gas limit skips estimation, so a revert arrives as a mined
  // receipt with status "reverted" rather than a thrown error. Surface it.
  if (receipt.status === "reverted") {
    throw new Error(`transaction reverted on chain: ${functionName}`);
  }
  return receipt;
}

console.log(`Verifying against Besu at ${RPC_URL}`);
console.log(`chainId ${deployment.chainId}, gas price ${await publicClient.getGasPrice()}\n`);

const latest = await publicClient.getBlock();
const expiry = BigInt(Number(latest.timestamp) + 30 * 86_400);

for (const [name, account, role] of [
  ["Priya Menon", priya, Role.Manager],
  ["Rahul Nair", rahul, Role.User],
] as const) {
  try {
    await send(admin, deployment.contracts.IdentityRegistry, IdentityRegistryArtifact.abi, "register", [
      account.address,
      didFromAddress(account.address, deployment.chainId),
    ]);
  } catch {
    // Already registered — re-runnable.
  }
  await send(admin, deployment.contracts.RoleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
    account.address,
    role,
    expiry,
  ]);
  console.log(`  ✓ ${name} registered and granted ${Role[role]}`);
}

const mint = await send(admin, deployment.contracts.AssetToken, AssetTokenArtifact.abi, "mint", [
  priya.address,
  Role.Manager,
  `0x${"a3".repeat(32)}`,
]);
console.log(`  ✓ Asset minted in block ${mint.blockNumber}`);

console.log("\nAttempting a transfer to a User-only recipient…");
try {
  // simulateContract executes the call against current state and throws carrying
  // the revert data, which is what holds the decodable custom error. Sending the
  // transaction instead mines a reverted receipt with the reason discarded — the
  // gate still holds, but the sentence a judge reads is lost.
  await publicClient.simulateContract({
    account: priya,
    address: deployment.contracts.AssetToken,
    abi: AssetTokenArtifact.abi as never,
    functionName: "transferFrom",
    args: [priya.address, rahul.address, 1n] as never,
  });
  console.log("  ✗ UNEXPECTED: the transfer succeeded. The gate is not working on Besu.");
  process.exit(1);
} catch (error) {
  const explained = explainContractError(error);
  if (explained.reason === "unknown") {
    console.log(`  ✗ Reverted, but the reason did not decode: ${String(error).slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`  ⛔ ${explained.title} — ${explained.detail}`);
  console.log(`  ✓ Decoded on chain as ${explained.errorName}`);
}

console.log("\nThe credential gate holds on Besu, with the same bytecode as Hardhat.");
