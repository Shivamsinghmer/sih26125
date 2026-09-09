import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// RoleRegistry.Role enum ordinals
const Role = {
  None: 0,
  Restricted: 1,
  Confidential: 2,
  Secret: 3,
  TopSecret: 4,
} as const;

const METADATA_HASH = ethers.keccak256(ethers.toUtf8Bytes("SIGNAL-ANALYSER-SN-8823"));

async function deployFixture() {
  const [admin, manager, otherManager, plainUser, stranger] = await ethers.getSigners();
  // `noUncheckedIndexedAccess` types these as possibly undefined; the Hardhat
  // network always supplies 20, so assert once rather than at every use.
  if (!admin || !manager || !otherManager || !plainUser || !stranger) {
    throw new Error("expected at least 5 signers from the Hardhat network");
  }

  const RoleRegistry = await ethers.getContractFactory("RoleRegistry");
  const roleRegistry = await RoleRegistry.deploy(admin.address);

  const AssetToken = await ethers.getContractFactory("AssetToken");
  const assetToken = await AssetToken.deploy(admin.address, await roleRegistry.getAddress());

  const oneYearOut = (await time.latest()) + 365 * 24 * 60 * 60;

  // manager and otherManager hold Manager; plainUser holds only User; stranger holds nothing.
  await roleRegistry.grantBusinessRole(manager.address, Role.Secret, oneYearOut);
  await roleRegistry.grantBusinessRole(otherManager.address, Role.Secret, oneYearOut);
  await roleRegistry.grantBusinessRole(plainUser.address, Role.Restricted, oneYearOut);

  return { roleRegistry, assetToken, admin, manager, otherManager, plainUser, stranger, oneYearOut };
}

describe("AssetToken", () => {
  // This test exists first on purpose. OpenZeppelin v5 routes mints and burns through
  // _update with from/to == address(0). A role check that does not exempt them makes
  // minting impossible, and the failure looks like a permissions bug rather than a
  // hook bug.
  describe("mint and burn are exempt from the role check", () => {
    it("mints to a recipient holding no role at all", async () => {
      const { assetToken, stranger } = await loadFixture(deployFixture);

      await expect(assetToken.mint(stranger.address, Role.Secret, METADATA_HASH)).to.not.be.reverted;
      expect(await assetToken.ownerOf(1)).to.equal(stranger.address);
    });

    it("mints to a recipient whose role is lower than the asset requires", async () => {
      const { assetToken, plainUser } = await loadFixture(deployFixture);

      await expect(assetToken.mint(plainUser.address, Role.Secret, METADATA_HASH)).to.not.be.reverted;
      expect(await assetToken.ownerOf(1)).to.equal(plainUser.address);
    });

    it("records the required role and metadata hash at mint time", async () => {
      const { assetToken, manager } = await loadFixture(deployFixture);

      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      const asset = await assetToken.assets(1);
      expect(asset.requiredRole).to.equal(Role.Secret);
      expect(asset.metadataHash).to.equal(METADATA_HASH);
    });
  });

  describe("credential-gated transfers", () => {
    it("allows a transfer when the recipient holds the required role", async () => {
      const { assetToken, manager, otherManager } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(
        assetToken.connect(manager).transferFrom(manager.address, otherManager.address, 1),
      ).to.not.be.reverted;

      expect(await assetToken.ownerOf(1)).to.equal(otherManager.address);
    });

    // The demo's step 3: the holder tries to move an asset to a colleague who holds
    // only the User role, and the chain refuses.
    it("reverts when the recipient holds a role but not the required one", async () => {
      const { assetToken, manager, plainUser } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(assetToken.connect(manager).transferFrom(manager.address, plainUser.address, 1))
        .to.be.revertedWithCustomError(assetToken, "TransferBlockedRoleNeverGranted")
        .withArgs(plainUser.address, Role.Secret);

      expect(await assetToken.ownerOf(1)).to.equal(manager.address);
    });

    it("reverts when the recipient holds no role at all", async () => {
      const { assetToken, manager, stranger } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(assetToken.connect(manager).transferFrom(manager.address, stranger.address, 1))
        .to.be.revertedWithCustomError(assetToken, "TransferBlockedRoleNeverGranted")
        .withArgs(stranger.address, Role.Secret);
    });

    // The demo's step 4: revoking propagates immediately to every future transfer.
    it("reverts with the revoked reason after the recipient's role is revoked", async () => {
      const { roleRegistry, assetToken, manager, otherManager } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await roleRegistry.revokeBusinessRole(otherManager.address, Role.Secret);

      await expect(assetToken.connect(manager).transferFrom(manager.address, otherManager.address, 1))
        .to.be.revertedWithCustomError(assetToken, "TransferBlockedRoleRevoked")
        .withArgs(otherManager.address, Role.Secret);
    });

    // The expiry timestamp is carried in the error so the UI can render
    // "expired 12 Aug 2026" rather than a generic failure.
    it("reverts with the expiry timestamp once the recipient's role has expired", async () => {
      const { assetToken, manager, otherManager, oneYearOut } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await time.increaseTo(oneYearOut + 1);

      await expect(assetToken.connect(manager).transferFrom(manager.address, otherManager.address, 1))
        .to.be.revertedWithCustomError(assetToken, "TransferBlockedRoleExpired")
        .withArgs(otherManager.address, Role.Secret, oneYearOut);
    });
  });

  describe("batchReassign", () => {
    it("moves every asset from a departing holder in one transaction", async () => {
      const { assetToken, manager, otherManager } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await assetToken.batchReassign(manager.address, otherManager.address, [1, 2, 3]);

      expect(await assetToken.ownerOf(1)).to.equal(otherManager.address);
      expect(await assetToken.ownerOf(2)).to.equal(otherManager.address);
      expect(await assetToken.ownerOf(3)).to.equal(otherManager.address);
    });

    it("still enforces the role check on the reassignment target", async () => {
      const { assetToken, manager, plainUser } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(assetToken.batchReassign(manager.address, plainUser.address, [1]))
        .to.be.revertedWithCustomError(assetToken, "TransferBlockedRoleNeverGranted")
        .withArgs(plainUser.address, Role.Secret);
    });

    it("reverts if an asset is not owned by the stated holder", async () => {
      const { assetToken, manager, otherManager, plainUser } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(assetToken.batchReassign(plainUser.address, otherManager.address, [1]))
        .to.be.revertedWithCustomError(assetToken, "UnexpectedOwner")
        .withArgs(1, plainUser.address, manager.address);
    });

    it("rejects a caller without the issuer role", async () => {
      const { assetToken, manager, otherManager } = await loadFixture(deployFixture);
      await assetToken.mint(manager.address, Role.Secret, METADATA_HASH);

      await expect(
        assetToken.connect(manager).batchReassign(manager.address, otherManager.address, [1]),
      ).to.be.revertedWithCustomError(assetToken, "AccessControlUnauthorizedAccount");
    });
  });

  describe("minting is gated on the issuer role", () => {
    it("rejects a mint from an account without the issuer role", async () => {
      const { assetToken, manager } = await loadFixture(deployFixture);

      await expect(
        assetToken.connect(manager).mint(manager.address, Role.Secret, METADATA_HASH),
      ).to.be.revertedWithCustomError(assetToken, "AccessControlUnauthorizedAccount");
    });
  });
});
