/**
 * Stage the expired-credential scenario.
 *
 *   bun run scripts/stage-expired.ts
 *
 * Re-issues Priya a Manager credential, then advances chain time past its
 * validity window. Expiry is the one failure mode that cannot be reached by
 * calling the contract — `grantBusinessRole` refuses an expiry in the past —
 * so it needs time itself to move.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import { Role } from "@sih26125/identity";

import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const DAYS = 86_400;

const admin = privateKeyToAccount(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex,
);
const priya = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as Hex,
);

const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
const adminWallet = createWalletClient({ account: admin, chain: hardhat, transport: http(RPC_URL) });

const deployment = JSON.parse(
  readFileSync(
    // `import.meta.dir` is Bun-only; this resolves the same path under both runtimes.
    fileURLToPath(new URL("../../../deployments/localhost.json", import.meta.url)),
    "utf8",
  ),
) as { contracts: { RoleRegistry: Address } };

const latest = await publicClient.getBlock();
const expiresAt = BigInt(Number(latest.timestamp) + 30 * DAYS);

const hash = await adminWallet.writeContract({
  address: deployment.contracts.RoleRegistry,
  abi: RoleRegistryArtifact.abi as never,
  functionName: "grantBusinessRole",
  args: [priya.address, Role.Manager, expiresAt] as never,
});
await publicClient.waitForTransactionReceipt({ hash });
console.log(`✓ Priya re-granted Manager, valid until ${new Date(Number(expiresAt) * 1000).toDateString()}`);

// Push the chain clock past the validity window.
await fetch(RPC_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "evm_increaseTime",
    params: [31 * DAYS],
  }),
});
await fetch(RPC_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "evm_mine", params: [] }),
});

const now = await publicClient.getBlock();
console.log(`✓ Chain time advanced 31 days — now ${new Date(Number(now.timestamp) * 1000).toDateString()}`);
console.log("\nNow attempt asset #1 from Rahul Nair → Priya Menon in the console.");
