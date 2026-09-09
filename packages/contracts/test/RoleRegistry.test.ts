import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const Role = {
  None: 0,
  Restricted: 1,
  Confidential: 2,
  Secret: 3,
  TopSecret: 4,
} as const;

const InvalidReason = {
  Valid: 0,
  NeverGranted: 1,
  Revoked: 2,
  Expired: 3,
} as const;

async function deployFixture() {
  const [admin, employee, outsider] = await ethers.getSigners();
  // See AssetToken.test.ts — `noUncheckedIndexedAccess` needs one assertion here.
  if (!admin || !employee || !outsider) {
    throw new Error("expected at least 3 signers from the Hardhat network");
  }
  const RoleRegistry = await ethers.getContractFactory("RoleRegistry");
  const roleRegistry = await RoleRegistry.deploy(admin.address);
  const oneYearOut = (await time.latest()) + 365 * 24 * 60 * 60;
  return { roleRegistry, admin, employee, outsider, oneYearOut };
}

describe("RoleRegistry", () => {
  it("reports NeverGranted for an account with no grant", async () => {
    const { roleRegistry, outsider } = await loadFixture(deployFixture);

    const [valid, reason] = await roleRegistry.checkRole(outsider.address, Role.Secret);
    expect(valid).to.equal(false);
    expect(reason).to.equal(InvalidReason.NeverGranted);
  });

  it("validates a freshly granted role", async () => {
    const { roleRegistry, employee, oneYearOut } = await loadFixture(deployFixture);
    await roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut);

    const [valid, reason, expiry] = await roleRegistry.checkRole(employee.address, Role.Secret);
    expect(valid).to.equal(true);
    expect(reason).to.equal(InvalidReason.Valid);
    expect(expiry).to.equal(oneYearOut);
  });

  it("keeps roles independent of one another", async () => {
    const { roleRegistry, employee, oneYearOut } = await loadFixture(deployFixture);
    await roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut);

    expect(await roleRegistry.hasValidRole(employee.address, Role.Secret)).to.equal(true);
    expect(await roleRegistry.hasValidRole(employee.address, Role.Confidential)).to.equal(false);
  });

  it("reports Revoked after revocation", async () => {
    const { roleRegistry, employee, oneYearOut } = await loadFixture(deployFixture);
    await roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut);
    await roleRegistry.revokeBusinessRole(employee.address, Role.Secret);

    const [valid, reason] = await roleRegistry.checkRole(employee.address, Role.Secret);
    expect(valid).to.equal(false);
    expect(reason).to.equal(InvalidReason.Revoked);
  });

  it("reports Expired once the validity period passes", async () => {
    const { roleRegistry, employee, oneYearOut } = await loadFixture(deployFixture);
    await roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut);

    await time.increaseTo(oneYearOut + 1);

    const [valid, reason, expiry] = await roleRegistry.checkRole(employee.address, Role.Secret);
    expect(valid).to.equal(false);
    expect(reason).to.equal(InvalidReason.Expired);
    expect(expiry).to.equal(oneYearOut);
  });

  it("rejects a grant with an expiry in the past", async () => {
    const { roleRegistry, employee } = await loadFixture(deployFixture);
    const past = (await time.latest()) - 1;

    await expect(
      roleRegistry.grantBusinessRole(employee.address, Role.Secret, past),
    ).to.be.revertedWithCustomError(roleRegistry, "ExpiryInPast");
  });

  it("rejects granting the None role", async () => {
    const { roleRegistry, employee, oneYearOut } = await loadFixture(deployFixture);

    await expect(
      roleRegistry.grantBusinessRole(employee.address, Role.None, oneYearOut),
    ).to.be.revertedWithCustomError(roleRegistry, "InvalidRole");
  });

  it("rejects a grant from an account without the issuer role", async () => {
    const { roleRegistry, employee, outsider, oneYearOut } = await loadFixture(deployFixture);

    await expect(
      roleRegistry.connect(outsider).grantBusinessRole(employee.address, Role.Secret, oneYearOut),
    ).to.be.revertedWithCustomError(roleRegistry, "AccessControlUnauthorizedAccount");
  });

  it("rejects a revocation from an account without the revoker role", async () => {
    const { roleRegistry, employee, outsider, oneYearOut } = await loadFixture(deployFixture);
    await roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut);

    await expect(
      roleRegistry.connect(outsider).revokeBusinessRole(employee.address, Role.Secret),
    ).to.be.revertedWithCustomError(roleRegistry, "AccessControlUnauthorizedAccount");
  });

  it("emits an event carrying the issuer, for the audit trail", async () => {
    const { roleRegistry, admin, employee, oneYearOut } = await loadFixture(deployFixture);

    await expect(roleRegistry.grantBusinessRole(employee.address, Role.Secret, oneYearOut))
      .to.emit(roleRegistry, "BusinessRoleGranted")
      .withArgs(employee.address, Role.Secret, oneYearOut, admin.address);
  });
});
