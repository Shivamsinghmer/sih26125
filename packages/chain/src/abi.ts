/**
 * Contract ABIs, read from Hardhat's compiled artifacts.
 *
 * `packages/contracts` must be built before this package — Turborepo enforces
 * that ordering via `dependsOn: ["^build"]`, and `@sih26125/contracts` is a
 * workspace dependency so the graph knows about it.
 */
import AssetTokenArtifact from "../../contracts/artifacts/contracts/AssetToken.sol/AssetToken.json";
import IdentityRegistryArtifact from "../../contracts/artifacts/contracts/IdentityRegistry.sol/IdentityRegistry.json";
import RoleRegistryArtifact from "../../contracts/artifacts/contracts/RoleRegistry.sol/RoleRegistry.json";

export const assetTokenAbi = AssetTokenArtifact.abi;
export const identityRegistryAbi = IdentityRegistryArtifact.abi;
export const roleRegistryAbi = RoleRegistryArtifact.abi;

/**
 * Every custom error the system can revert with, in one ABI, so a decoder can
 * be handed a revert from any of the three contracts without knowing which one
 * produced it.
 */
export const allErrorsAbi = [
  ...assetTokenAbi.filter((entry) => entry.type === "error"),
  ...identityRegistryAbi.filter((entry) => entry.type === "error"),
  ...roleRegistryAbi.filter((entry) => entry.type === "error"),
] as const;
