// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {RoleRegistry} from "./RoleRegistry.sol";

/// @title AssetToken
/// @notice ERC-721 representing custody of a physical or digital asset. Every transfer
/// checks the recipient's role against RoleRegistry and reverts if it is missing,
/// expired or revoked. This check lives in `_update` — the contract itself — so it
/// cannot be bypassed by whichever client, script or UI initiates the transfer.
contract AssetToken is ERC721, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    RoleRegistry public immutable roleRegistry;

    struct AssetInfo {
        RoleRegistry.Role requiredRole;
        bytes32 metadataHash;
        uint64 mintedAt;
    }

    mapping(uint256 => AssetInfo) public assets;
    uint256 private _nextTokenId = 1;

    error ZeroAddress();
    error UnexpectedOwner(uint256 tokenId, address expected, address actual);
    error TransferBlockedRoleNeverGranted(address recipient, RoleRegistry.Role requiredRole);
    error TransferBlockedRoleRevoked(address recipient, RoleRegistry.Role requiredRole);
    error TransferBlockedRoleExpired(address recipient, RoleRegistry.Role requiredRole, uint64 expiredAt);

    event AssetMinted(uint256 indexed tokenId, address indexed to, RoleRegistry.Role requiredRole, bytes32 metadataHash);

    constructor(address admin, address roleRegistryAddress) ERC721("SIH26125 Asset", "BEL-ASSET") {
        if (admin == address(0) || roleRegistryAddress == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        roleRegistry = RoleRegistry(roleRegistryAddress);
    }

    /// @notice Mint a new asset and assign it to `to`. Minting is exempt from the role
    /// check performed on transfers — see `_update` below for why.
    function mint(address to, RoleRegistry.Role requiredRole, bytes32 metadataHash) external onlyRole(ISSUER_ROLE) returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        assets[tokenId] = AssetInfo({requiredRole: requiredRole, metadataHash: metadataHash, mintedAt: uint64(block.timestamp)});
        _safeMint(to, tokenId);
        emit AssetMinted(tokenId, to, requiredRole, metadataHash);
    }

    /// @notice Administrative override used for offboarding: move many assets from one
    /// holder to another in a single transaction, still subject to the same role check
    /// on the recipient as an ordinary transfer.
    function batchReassign(address from, address to, uint256[] calldata tokenIds) external onlyRole(ISSUER_ROLE) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            address currentOwner = ownerOf(tokenId);
            if (currentOwner != from) revert UnexpectedOwner(tokenId, from, currentOwner);
            _update(to, tokenId, address(0));
        }
    }

    /// @dev OpenZeppelin v5 calls `_update` for mints (from == address(0)) and burns
    /// (to == address(0)) as well as ordinary transfers. The role check applies only
    /// when an asset actually moves to a new holder — minting and burning are exempt,
    /// otherwise minting to a brand-new identity would revert before they ever hold a
    /// role.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        bool isMint = from == address(0);
        bool isBurn = to == address(0);

        if (!isMint && !isBurn) {
            RoleRegistry.Role requiredRole = assets[tokenId].requiredRole;
            (bool valid, RoleRegistry.InvalidReason reason, uint64 expiry) = roleRegistry.checkRole(to, requiredRole);
            if (!valid) {
                if (reason == RoleRegistry.InvalidReason.Revoked) {
                    revert TransferBlockedRoleRevoked(to, requiredRole);
                } else if (reason == RoleRegistry.InvalidReason.Expired) {
                    revert TransferBlockedRoleExpired(to, requiredRole, expiry);
                } else {
                    revert TransferBlockedRoleNeverGranted(to, requiredRole);
                }
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
