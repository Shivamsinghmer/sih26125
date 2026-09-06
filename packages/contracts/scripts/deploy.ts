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

  const CredentialStatus = await ethers.getContractFactory("CredentialStatus");
  const credentialStatus = await CredentialStatus.deploy(deployer.address);
  await credentialStatus.waitForDeployment();

  const GUARDIAN_TIMELOCK = 48 * 60 * 60;
  const GuardianRecovery = await ethers.getContractFactory("GuardianRecovery");
  const guardianRecovery = await GuardianRecovery.deploy(
    deployer.address,
    await identityRegistry.getAddress(),
    await roleRegistry.getAddress(),
    GUARDIAN_TIMELOCK,
  );
  await guardianRecovery.waitForDeployment();

  // GuardianRecovery acts for a guardian quorum, so it holds the rights to
  // rotate an identity and move a credential. No administrator key is involved
  // in a recovery, which is the point of it.
  const recoveryAddress = await guardianRecovery.getAddress();
  await (await identityRegistry.grantRole(await identityRegistry.ROTATOR_ROLE(), recoveryAddress)).wait();
  await (await roleRegistry.grantRole(await roleRegistry.ISSUER_ROLE(), recoveryAddress)).wait();
  await (await roleRegistry.grantRole(await roleRegistry.REVOKER_ROLE(), recoveryAddress)).wait();

  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      IdentityRegistry: await identityRegistry.getAddress(),
      RoleRegistry: await roleRegistry.getAddress(),
      AssetToken: await assetToken.getAddress(),
      CredentialStatus: await credentialStatus.getAddress(),
      GuardianRecovery: recoveryAddress,
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
