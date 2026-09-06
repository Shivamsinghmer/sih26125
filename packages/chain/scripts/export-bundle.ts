/**
 * Export one asset's complete chain of custody as a signed, offline-verifiable
 * bundle.
 *
 *   bun run scripts/export-bundle.ts [tokenId] [outfile]
 *
 * Everything the verifier needs travels in the file: the credentials, the
 * ownership history, and a snapshot of what the RoleRegistry said at the moment
 * of export. What cannot travel is proof that the snapshot is still current —
 * the verifier reports that limit rather than papering over it.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createPublicClient, http, parseEventLogs, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import {
  BUNDLE_FORMAT,
  BUNDLE_VERSION,
  signBundle,
  type CustodyBundle,
  type CustodyStep,
  type StatusEntry,
} from "@sih26125/custody";
import { Role, issueRoleCredential, roleName } from "@sih26125/identity";

import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";
import { readFileSync } from "node:fs";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const tokenId = BigInt(process.argv[2] ?? "1");
const outFile = process.argv[3] ?? `asset-${tokenId}-custody.json`;

const ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const admin = privateKeyToAccount(ADMIN_KEY as Hex);

const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });

const deployment = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../deployments/localhost.json", import.meta.url)),
    "utf8",
  ),
) as {
  chainId: number;
  contracts: { IdentityRegistry: Address; RoleRegistry: Address; AssetToken: Address };
};

const REASONS = ["valid", "never-granted", "revoked", "expired"] as const;

// -------------------------------------------------------------------- asset
const info = (await publicClient.readContract({
  address: deployment.contracts.AssetToken,
  abi: AssetTokenArtifact.abi as never,
  functionName: "assets",
  args: [tokenId] as never,
})) as [number, string, bigint];

const requiredRole = Number(info[0]) as Role;

// ------------------------------------------------------------------ custody
const rawLogs = await publicClient.getLogs({
  address: deployment.contracts.AssetToken,
  fromBlock: 0n,
  toBlock: "latest",
});

const transfers = (
  parseEventLogs({ abi: AssetTokenArtifact.abi as never, logs: rawLogs as never }) as unknown as {
    eventName?: string;
    args?: Record<string, unknown>;
    blockNumber?: bigint;
    transactionHash?: string;
  }[]
).filter((log) => log.eventName === "Transfer" && (log.args?.tokenId as bigint) === tokenId);

const blockTimes = new Map<bigint, number>();
for (const log of transfers) {
  const blockNumber = log.blockNumber ?? 0n;
  if (!blockTimes.has(blockNumber)) {
    const block = await publicClient.getBlock({ blockNumber });
    blockTimes.set(blockNumber, Number(block.timestamp));
  }
}

const custody: CustodyStep[] = transfers.map((log) => ({
  from: String(log.args?.from ?? "").toLowerCase(),
  to: String(log.args?.to ?? "").toLowerCase(),
  blockNumber: Number(log.blockNumber ?? 0n),
  timestamp: blockTimes.get(log.blockNumber ?? 0n) ?? 0,
  transactionHash: String(log.transactionHash ?? ""),
}));

if (custody.length === 0) throw new Error(`Asset #${tokenId} has no transfer history`);

// ------------------------------------------------- status snapshot + credentials
const accounts = [...new Set(custody.flatMap((s) => [s.from, s.to]))].filter(
  (a) => a !== "0x0000000000000000000000000000000000000000",
);

const latestBlock = await publicClient.getBlock();
const statusEntries: StatusEntry[] = [];
const credentials: string[] = [];

for (const account of accounts) {
  const [valid, reasonIndex, expiry] = (await publicClient.readContract({
    address: deployment.contracts.RoleRegistry,
    abi: RoleRegistryArtifact.abi as never,
    functionName: "checkRole",
    args: [account as Address, requiredRole] as never,
  })) as [boolean, number, bigint];

  statusEntries.push({
    account,
    role: requiredRole,
    roleLabel: roleName(requiredRole),
    valid,
    reason: REASONS[Number(reasonIndex)] ?? "never-granted",
    expiry: Number(expiry),
  });

  // Attest the grant the registry currently records. In a deployed system the
  // holder presents the credential they were issued; here the exporting
  // authority re-attests what it can see, which carries the same signature.
  if (valid) {
    credentials.push(
      await issueRoleCredential({
        issuerPrivateKey: ADMIN_KEY,
        issuerAddress: admin.address,
        subjectAddress: account,
        role: requiredRole,
        chainId: deployment.chainId,
        roleRegistryAddress: deployment.contracts.RoleRegistry,
        expiresAt: Number(expiry),
      }),
    );
  }
}

// ------------------------------------------------------------------- bundle
const unsigned: CustodyBundle = {
  format: BUNDLE_FORMAT,
  version: BUNDLE_VERSION,
  exportedAt: Math.floor(Date.now() / 1000),
  chain: {
    chainId: deployment.chainId,
    contracts: {
      IdentityRegistry: deployment.contracts.IdentityRegistry,
      RoleRegistry: deployment.contracts.RoleRegistry,
      AssetToken: deployment.contracts.AssetToken,
    },
  },
  asset: {
    tokenId: tokenId.toString(),
    requiredRole,
    requiredRoleLabel: roleName(requiredRole),
    metadataHash: info[1],
    mintedAt: Number(info[2]),
  },
  custody,
  credentials,
  status: {
    takenAtBlock: Number(latestBlock.number),
    takenAt: Number(latestBlock.timestamp),
    entries: statusEntries,
  },
};

const bundle = await signBundle(unsigned, {
  issuerPrivateKey: ADMIN_KEY,
  issuerAddress: admin.address,
});

writeFileSync(outFile, `${JSON.stringify(bundle, null, 2)}\n`);

console.log(`Exported asset #${tokenId} to ${outFile}`);
console.log(`  ${custody.length} custody step(s), ${credentials.length} credential(s)`);
console.log(`  status snapshot at block ${bundle.status.takenAtBlock}`);
console.log(`  signed by ${admin.address}`);
console.log(`\nVerify offline with:\n  bun run apps/verifier/src/index.ts ${outFile}`);
