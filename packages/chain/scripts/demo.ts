/**
 * The five-step demo, end to end, against a running Hardhat node.
 *
 *   Terminal 1:  pnpm --filter @sih26125/contracts node
 *   Terminal 2:  pnpm --filter @sih26125/chain demo
 *
 * This is the spine of the pitch executed as code: identity issuance, credential
 * issuance, minting, a blocked transfer, revocation, and an audit replay. If this
 * script passes, the system works — everything above it is presentation.
 */
import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

import { Role, issueRoleCredential, verifyRoleCredential, didFromAddress } from "@sih26125/identity";

import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import IdentityRegistryArtifact from "../../contracts/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";
import { explainContractError } from "../src/errors.js";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

/** Hardhat's published development keys. They control nothing off a local chain. */
const ACCOUNTS = {
  admin: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  employee: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  colleague: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
} as const;

const admin = privateKeyToAccount(ACCOUNTS.admin as Hex);
const employee = privateKeyToAccount(ACCOUNTS.employee as Hex);
const colleague = privateKeyToAccount(ACCOUNTS.colleague as Hex);

const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
const adminWallet = createWalletClient({ account: admin, chain: hardhat, transport: http(RPC_URL) });
const employeeWallet = createWalletClient({ account: employee, chain: hardhat, transport: http(RPC_URL) });

const HOUR = 3600;
const now = () => Math.floor(Date.now() / 1000);

function step(n: number, title: string) {
  console.log(`\n${"─".repeat(72)}\nSTEP ${n}  ${title}\n${"─".repeat(72)}`);
}
function ok(message: string) {
  console.log(`  ✓ ${message}`);
}
function blocked(message: string) {
  console.log(`  ⛔ ${message}`);
}

async function deploy(
  artifact: { abi: unknown[]; bytecode: string },
  args: unknown[],
): Promise<Address> {
  const hash = await adminWallet.deployContract({
    abi: artifact.abi as never,
    bytecode: artifact.bytecode as Hex,
    args: args as never,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("deployment produced no address");
  return receipt.contractAddress;
}

async function main() {
  console.log(`\nSIH26125 — credential-gated asset custody\nRPC: ${RPC_URL}`);

  // ---------------------------------------------------------------- deploy
  const identityRegistry = await deploy(IdentityRegistryArtifact as never, [admin.address]);
  const roleRegistry = await deploy(RoleRegistryArtifact as never, [admin.address]);
  const assetToken = await deploy(AssetTokenArtifact as never, [admin.address, roleRegistry]);

  console.log("\nContracts deployed:");
  console.log(`  IdentityRegistry  ${identityRegistry}`);
  console.log(`  RoleRegistry      ${roleRegistry}`);
  console.log(`  AssetToken        ${assetToken}`);

  const write = async (address: Address, abi: unknown[], functionName: string, args: unknown[], account = admin) => {
    const wallet = account === admin ? adminWallet : employeeWallet;
    const hash = await wallet.writeContract({
      address,
      abi: abi as never,
      functionName,
      args: args as never,
    });
    return publicClient.waitForTransactionReceipt({ hash });
  };

  // ------------------------------------------------- 1. identity + credential
  step(1, "Admin issues a decentralised identity and a Manager credential");

  const employeeDid = didFromAddress(employee.address, hardhat.id);
  await write(identityRegistry, IdentityRegistryArtifact.abi, "register", [employee.address, employeeDid]);
  ok(`DID registered on chain: ${employeeDid}`);

  const expiresAt = now() + 24 * HOUR;
  await write(roleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
    employee.address,
    Role.Manager,
    BigInt(expiresAt),
  ]);
  ok("Manager role anchored in RoleRegistry");

  const credential = await issueRoleCredential({
    issuerPrivateKey: ACCOUNTS.admin,
    issuerAddress: admin.address,
    subjectAddress: employee.address,
    role: Role.Manager,
    chainId: hardhat.id,
    roleRegistryAddress: roleRegistry,
    expiresAt,
  });
  const verified = await verifyRoleCredential(credential);
  ok(`Verifiable Credential issued and verified offline — ${verified.roleName}, holder ${verified.subjectAddress}`);

  // The colleague is a real employee too, but holds only the User role.
  const colleagueDid = didFromAddress(colleague.address, hardhat.id);
  await write(identityRegistry, IdentityRegistryArtifact.abi, "register", [colleague.address, colleagueDid]);
  await write(roleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
    colleague.address,
    Role.User,
    BigInt(expiresAt),
  ]);
  ok(`Colleague registered holding only the User role: ${colleague.address}`);

  // --------------------------------------------------------------- 2. mint
  step(2, "Admin mints an asset and assigns it to the employee");

  const serial = "Signal Analyser SN-8823";
  const metadataHash = `0x${"a3".repeat(32)}` as Hex;
  await write(assetToken, AssetTokenArtifact.abi, "mint", [
    employee.address,
    Role.Manager,
    metadataHash,
  ]);
  const owner = await publicClient.readContract({
    address: assetToken,
    abi: AssetTokenArtifact.abi as never,
    functionName: "ownerOf",
    args: [1n],
  });
  ok(`${serial} minted as asset #1, requires a Manager credential to hold`);
  ok(`Current holder: ${owner as string}`);

  // ---------------------------------------------------- 3. the blocked transfer
  step(3, "Employee tries to transfer the asset to a User-only colleague");

  try {
    await write(
      assetToken,
      AssetTokenArtifact.abi,
      "transferFrom",
      [employee.address, colleague.address, 1n],
      employee,
    );
    console.log("  ✗ UNEXPECTED: the transfer succeeded. The gate is not working.");
    process.exitCode = 1;
  } catch (error) {
    const explained = explainContractError(error);
    blocked(`${explained.title} — ${explained.detail}`);
    ok(`Decoded on chain as ${explained.errorName}`);
  }

  // ------------------------------------------------------------ 4. revocation
  step(4, "Admin revokes the employee's Manager credential");

  await write(roleRegistry, RoleRegistryArtifact.abi, "revokeBusinessRole", [
    employee.address,
    Role.Manager,
  ]);
  ok("Revocation written on chain — a single transaction");

  // Grant the colleague Manager so the *only* thing failing is the revoked holder.
  await write(roleRegistry, RoleRegistryArtifact.abi, "grantBusinessRole", [
    colleague.address,
    Role.Manager,
    BigInt(expiresAt),
  ]);

  try {
    await write(
      assetToken,
      AssetTokenArtifact.abi,
      "batchReassign",
      [employee.address, employee.address, [1n]],
    );
    console.log("  ✗ UNEXPECTED: a revoked holder still passed the check.");
    process.exitCode = 1;
  } catch (error) {
    const explained = explainContractError(error);
    blocked(`${explained.title} — ${explained.detail}`);
  }

  await write(assetToken, AssetTokenArtifact.abi, "batchReassign", [
    employee.address,
    colleague.address,
    [1n],
  ]);
  ok("Offboarding: asset reassigned to a colleague who does hold a valid Manager credential");

  // ----------------------------------------------------------------- 5. audit
  step(5, "Auditor replays the full history from chain events alone");

  // Scoped to this run's own three contracts. An unscoped getLogs would also
  // pick up any other contract ever deployed on this chain since block zero —
  // harmless on a chain used only for this script, misleading on a shared dev
  // node that has seen other deployments in the same session.
  const logs = await publicClient.getLogs({
    address: [identityRegistry, roleRegistry, assetToken],
    fromBlock: 0n,
    toBlock: "latest",
  });
  const byAddress = new Map<string, number>();
  for (const log of logs) {
    const key = log.address.toLowerCase();
    byAddress.set(key, (byAddress.get(key) ?? 0) + 1);
  }
  ok(`${logs.length} events recorded across ${byAddress.size} contracts`);
  console.log(`      IdentityRegistry  ${byAddress.get(identityRegistry.toLowerCase()) ?? 0} events`);
  console.log(`      RoleRegistry      ${byAddress.get(roleRegistry.toLowerCase()) ?? 0} events`);
  console.log(`      AssetToken        ${byAddress.get(assetToken.toLowerCase()) ?? 0} events`);

  console.log(
    "\n" +
      "Ownership, permission and history are one cryptographic object.\n" +
      "The transfer did not fail because a UI said no — it failed in the contract.\n",
  );
}

main().catch((error) => {
  console.error("\nDemo failed:", error);
  process.exitCode = 1;
});
