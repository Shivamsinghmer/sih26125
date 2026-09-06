import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const Role = { None: 0, User: 1, Auditor: 2, Manager: 3, Admin: 4 } as const;

const TIMELOCK = 48 * 60 * 60; // 48 hours

async function deployFixture() {
  const signers = await ethers.getSigners();
  const [admin, employee, newKey, g1, g2, g3, outsider] = signers;
  if (!admin || !employee || !newKey || !g1 || !g2 || !g3 || !outsider) {
    throw new Error("expected at least 7 signers from the Hardhat network");
  }

  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(admin.address);

  const RoleRegistry = await ethers.getContractFactory("RoleRegistry");
  const roleRegistry = await RoleRegistry.deploy(admin.address);

  const GuardianRecovery = await ethers.getContractFactory("GuardianRecovery");
  const recovery = await GuardianRecovery.deploy(
    admin.address,
    await identityRegistry.getAddress(),
    await roleRegistry.getAddress(),
    TIMELOCK,
  );

  // Recovery acts on the registries on the quorum's behalf, so it holds the
  // rights to rotate an identity and to move a credential — never an admin key.
  await identityRegistry.grantRole(await identityRegistry.ROTATOR_ROLE(), await recovery.getAddress());
  await roleRegistry.grantRole(await roleRegistry.ISSUER_ROLE(), await recovery.getAddress());
  await roleRegistry.grantRole(await roleRegistry.REVOKER_ROLE(), await recovery.getAddress());

  await identityRegistry.register(employee.address, `did:ethr:0x7a69:${employee.address.toLowerCase()}`);
  const oneYearOut = (await time.latest()) + 365 * 24 * 60 * 60;
  await roleRegistry.grantBusinessRole(employee.address, Role.Manager, oneYearOut);

  await recovery.configureGuardians(
    employee.address,
    [g1.address, g2.address, g3.address],
    2,
  );

  return {
    identityRegistry,
    roleRegistry,
    recovery,
    admin,
    employee,
    newKey,
    g1,
    g2,
    g3,
    outsider,
    oneYearOut,
  };
}

describe("GuardianRecovery", () => {
  describe("configuration", () => {
    it("records the guardians and the threshold", async () => {
      const { recovery, employee, g1, g2, g3 } = await loadFixture(deployFixture);
      const [guardians, threshold] = await recovery.guardiansOf(employee.address);
      expect(guardians).to.deep.equal([g1.address, g2.address, g3.address]);
      expect(threshold).to.equal(2);
    });

    it("rejects a threshold larger than the guardian set", async () => {
      const { recovery, employee, g1 } = await loadFixture(deployFixture);
      await expect(
        recovery.configureGuardians(employee.address, [g1.address], 2),
      ).to.be.revertedWithCustomError(recovery, "InvalidThreshold");
    });

    it("rejects a threshold of zero, which would let anyone recover anything", async () => {
      const { recovery, employee, g1 } = await loadFixture(deployFixture);
      await expect(
        recovery.configureGuardians(employee.address, [g1.address], 0),
      ).to.be.revertedWithCustomError(recovery, "InvalidThreshold");
    });
  });

  describe("proposing and approving", () => {
    it("counts the proposer's own approval", async () => {
      const { recovery, employee, newKey, g1 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      const request = await recovery.requestFor(employee.address);
      expect(request.approvals).to.equal(1);
      expect(request.newAccount).to.equal(newKey.address);
    });

    it("refuses a proposal from someone who is not a guardian", async () => {
      const { recovery, employee, newKey, outsider } = await loadFixture(deployFixture);
      await expect(
        recovery.connect(outsider).proposeRecovery(employee.address, newKey.address),
      ).to.be.revertedWithCustomError(recovery, "NotAGuardian");
    });

    it("refuses a second approval from the same guardian", async () => {
      const { recovery, employee, newKey, g1 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await expect(
        recovery.connect(g1).approveRecovery(employee.address),
      ).to.be.revertedWithCustomError(recovery, "AlreadyApproved");
    });

    it("announces the quorum and when it becomes executable", async () => {
      const { recovery, employee, newKey, g1, g2 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await expect(recovery.connect(g2).approveRecovery(employee.address)).to.emit(
        recovery,
        "RecoveryQuorumReached",
      );
    });
  });

  describe("the timelock", () => {
    it("refuses to execute before the timelock elapses", async () => {
      const { recovery, employee, newKey, g1, g2 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);

      await expect(
        recovery.executeRecovery(employee.address, [Role.Manager]),
      ).to.be.revertedWithCustomError(recovery, "TimelockNotElapsed");
    });

    it("refuses to execute without a quorum, however long anyone waits", async () => {
      const { recovery, employee, newKey, g1 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await time.increase(TIMELOCK * 10);

      await expect(
        recovery.executeRecovery(employee.address, [Role.Manager]),
      ).to.be.revertedWithCustomError(recovery, "QuorumNotReached");
    });
  });

  describe("the account can defend itself", () => {
    it("lets the account under recovery cancel during the timelock", async () => {
      const { recovery, employee, newKey, g1, g2 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);

      await expect(recovery.connect(employee).cancelRecovery(employee.address)).to.emit(
        recovery,
        "RecoveryCancelled",
      );

      await time.increase(TIMELOCK + 1);
      await expect(
        recovery.executeRecovery(employee.address, [Role.Manager]),
      ).to.be.revertedWithCustomError(recovery, "NoActiveRequest");
    });

    it("does not let a guardian cancel on the account's behalf", async () => {
      const { recovery, employee, newKey, g1 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await expect(
        recovery.connect(g1).cancelRecovery(employee.address),
      ).to.be.revertedWithCustomError(recovery, "NotTheAccount");
    });
  });

  describe("executing a recovery", () => {
    it("moves the DID onto the new key, keeping the identifier", async () => {
      const { recovery, identityRegistry, employee, newKey, g1, g2 } =
        await loadFixture(deployFixture);
      const before = await identityRegistry.get(employee.address);

      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);
      await time.increase(TIMELOCK + 1);
      await recovery.executeRecovery(employee.address, [Role.Manager]);

      const after = await identityRegistry.get(newKey.address);
      expect(after.did).to.equal(before.did);
      expect(after.registeredAt).to.equal(before.registeredAt);

      const old = await identityRegistry.get(employee.address);
      expect(old.status).to.equal(0); // Unregistered
    });

    it("carries the credential across with its original expiry", async () => {
      const { recovery, roleRegistry, employee, newKey, g1, g2, oneYearOut } =
        await loadFixture(deployFixture);

      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);
      await time.increase(TIMELOCK + 1);
      await recovery.executeRecovery(employee.address, [Role.Manager]);

      const [valid, , expiry] = await roleRegistry.checkRole(newKey.address, Role.Manager);
      expect(valid).to.equal(true);
      // Recovery must not be a way to quietly extend a credential.
      expect(expiry).to.equal(oneYearOut);
    });

    it("revokes the credential on the lost key", async () => {
      const { recovery, roleRegistry, employee, newKey, g1, g2 } =
        await loadFixture(deployFixture);

      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);
      await time.increase(TIMELOCK + 1);
      await recovery.executeRecovery(employee.address, [Role.Manager]);

      const [valid] = await roleRegistry.checkRole(employee.address, Role.Manager);
      expect(valid).to.equal(false);
    });

    it("cannot be executed twice", async () => {
      const { recovery, employee, newKey, g1, g2 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);
      await time.increase(TIMELOCK + 1);
      await recovery.executeRecovery(employee.address, [Role.Manager]);

      await expect(
        recovery.executeRecovery(employee.address, [Role.Manager]),
      ).to.be.revertedWithCustomError(recovery, "NoActiveRequest");
    });

    it("emits a notification that a recovery completed", async () => {
      const { recovery, employee, newKey, g1, g2 } = await loadFixture(deployFixture);
      await recovery.connect(g1).proposeRecovery(employee.address, newKey.address);
      await recovery.connect(g2).approveRecovery(employee.address);
      await time.increase(TIMELOCK + 1);

      await expect(recovery.executeRecovery(employee.address, [Role.Manager]))
        .to.emit(recovery, "RecoveryExecuted")
        .withArgs(employee.address, newKey.address);
    });
  });
});
