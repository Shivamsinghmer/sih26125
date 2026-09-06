import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const LIST = 1n;

async function deployFixture() {
  const signers = await ethers.getSigners();
  const [admin, outsider] = signers;
  if (!admin || !outsider) {
    throw new Error("expected at least 2 signers from the Hardhat network");
  }

  const CredentialStatus = await ethers.getContractFactory("CredentialStatus");
  const status = await CredentialStatus.deploy(admin.address);

  return { status, admin, outsider };
}

describe("CredentialStatus", () => {
  it("reports an untouched credential as not revoked", async () => {
    const { status } = await loadFixture(deployFixture);
    expect(await status.isRevoked(LIST, 4417n)).to.equal(false);
  });

  it("revokes a credential with a single bit flip", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setStatus(LIST, 4417n, true);
    expect(await status.isRevoked(LIST, 4417n)).to.equal(true);
  });

  it("can un-revoke, for a revocation entered in error", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setStatus(LIST, 4417n, true);
    await status.setStatus(LIST, 4417n, false);
    expect(await status.isRevoked(LIST, 4417n)).to.equal(false);
  });

  it("keeps neighbouring credentials in the same word independent", async () => {
    const { status } = await loadFixture(deployFixture);
    // 300 and 301 share a word; 300 and 44 do not.
    await status.setStatus(LIST, 300n, true);

    expect(await status.isRevoked(LIST, 300n)).to.equal(true);
    expect(await status.isRevoked(LIST, 301n)).to.equal(false);
    expect(await status.isRevoked(LIST, 299n)).to.equal(false);
    expect(await status.isRevoked(LIST, 44n)).to.equal(false);
  });

  it("keeps separate lists separate", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setStatus(LIST, 7n, true);
    expect(await status.isRevoked(2n, 7n)).to.equal(false);
  });

  it("revokes a whole set in one transaction, for offboarding", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setManyRevoked(LIST, [1n, 2n, 3n, 900n, 1024n]);

    for (const index of [1n, 2n, 3n, 900n, 1024n]) {
      expect(await status.isRevoked(LIST, index)).to.equal(true);
    }
    expect(await status.isRevoked(LIST, 4n)).to.equal(false);
  });

  it("tracks the highest index issued, so an unallocated credential is distinguishable", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setStatus(LIST, 500n, true);
    expect(await status.highestIndex(LIST)).to.equal(500n);

    await status.setStatus(LIST, 100n, true);
    expect(await status.highestIndex(LIST)).to.equal(500n);
  });

  it("exposes a whole word so a verifier can snapshot a range in one call", async () => {
    const { status } = await loadFixture(deployFixture);
    await status.setStatus(LIST, 0n, true);
    await status.setStatus(LIST, 5n, true);

    // Bits 0 and 5 of word 0 → 0b100001 = 33
    expect(await status.statusWord(LIST, 0n)).to.equal(33n);
  });

  it("rejects a write from an account without the writer role", async () => {
    const { status, outsider } = await loadFixture(deployFixture);
    await expect(
      status.connect(outsider).setStatus(LIST, 1n, true),
    ).to.be.revertedWithCustomError(status, "AccessControlUnauthorizedAccount");
  });
});
