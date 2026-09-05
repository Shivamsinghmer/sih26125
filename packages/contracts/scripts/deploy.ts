import { ethers } from "hardhat";

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

  const addresses = {
    IdentityRegistry: await identityRegistry.getAddress(),
    RoleRegistry: await roleRegistry.getAddress(),
    AssetToken: await assetToken.getAddress(),
  };

  console.table(addresses);
  console.log("\nJSON:\n" + JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
