import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { ethers, network } from "hardhat";

/**
 * Deploy the three Phase 1 contracts and record their addresses.
 *
 * The address file is what lets `apps/web` talk to a chain it did not deploy —
 * without it every restart would need addresses copied by hand, which is exactly
 * the kind of manual step that breaks a demo.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("no signer available");

  console.log("Deploying with:", deployer.address);

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();

  const RoleRegistry = await ethers.getContractFactory("RoleRegistry");
  const roleRegistry = await RoleRegistry.deploy(deployer.address);
  await roleRegistry.waitForDeployment();

  const AssetToken = await ethers.getContractFactory("AssetToken");
  const assetToken = await AssetToken.deploy(deployer.address, await roleRegistry.getAddress());
  await assetToken.waitForDeployment();

  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      IdentityRegistry: await identityRegistry.getAddress(),
      RoleRegistry: await roleRegistry.getAddress(),
      AssetToken: await assetToken.getAddress(),
    },
  };

  const outPath = resolve(__dirname, "../../../deployments", `${network.name}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.table(deployment.contracts);
  console.log(`\nWritten to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
