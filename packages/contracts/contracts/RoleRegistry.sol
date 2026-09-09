// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleRegistry
/// @notice On-chain source of truth for the four business roles named by the problem
/// statement — Admin, Manager, Auditor, User. Kept in a separate contract from
/// AssetToken so a revocation or a batch reassignment never requires touching, or
/// migrating, the token contract itself.
contract RoleRegistry is AccessControl {
    /**
     * The clearance a person holds, and the clearance an item requires.
     *
     * These are the levels the Ministry of Defence actually uses. The Security
     * Manual for Licensed Defence Industries (DDP, revised June 2025) para
     * 5.1.3 classifies "documents and equipment" on exactly this ladder, and
     * the ordering is load-bearing: Secret outranks Confidential.
     *
     * These used to be None/User/Auditor/Manager/Admin, which conflated two
     * different things — what a person is cleared to hold, and what a person is
     * authorised to do. Authority lives in the AccessControl roles below, where
     * it belongs; a clearance is not a job.
     *
     * The numeric values are unchanged by the rename, so credentials issued
     * against the old names still decode to the same level.
     */
    enum Role {
        None,
        Restricted,
        Confidential,
        Secret,
        TopSecret
    }

    enum InvalidReason {
        Valid,
        NeverGranted,
        Revoked,
        Expired
    }

    /// @dev Separation of duties: issuing and revoking are distinct technical roles,
    /// so no single account is required to hold both.
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    /// @dev Read-only inspection. The manual requires two physical verifications
    /// of classified holdings a calendar year, one of them by the Company Chief
    /// Security Officer; whoever performs them needs to see everything and
    /// change nothing. Separate from clearance: an inspector's authority to look
    /// is not the same fact as the level they are cleared to hold.
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct Grant {
        uint64 expiry; // unix seconds; 0 means never granted
        bool revoked;
    }

    mapping(address => mapping(Role => Grant)) private _grants;

    event BusinessRoleGranted(address indexed account, Role indexed role, uint64 expiry, address indexed issuer);
    event BusinessRoleRevoked(address indexed account, Role indexed role, address indexed revoker);

    error ZeroAddress();
    error InvalidRole();
    error ExpiryInPast(uint64 expiry);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    function grantBusinessRole(address account, Role role, uint64 expiry) external onlyRole(ISSUER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        if (role == Role.None) revert InvalidRole();
        if (expiry <= block.timestamp) revert ExpiryInPast(expiry);
        _grants[account][role] = Grant({expiry: expiry, revoked: false});
        emit BusinessRoleGranted(account, role, expiry, msg.sender);
    }

    function revokeBusinessRole(address account, Role role) external onlyRole(REVOKER_ROLE) {
        _grants[account][role].revoked = true;
        emit BusinessRoleRevoked(account, role, msg.sender);
    }

    /// @notice Full reason a role check passed or failed, so callers (including
    /// AssetToken's transfer hook) can surface a precise, decodable error to the UI
    /// instead of a generic "not authorized".
    function checkRole(address account, Role role) public view returns (bool valid, InvalidReason reason, uint64 expiry) {
        Grant memory g = _grants[account][role];
        if (g.expiry == 0) return (false, InvalidReason.NeverGranted, 0);
        if (g.revoked) return (false, InvalidReason.Revoked, g.expiry);
        if (g.expiry <= block.timestamp) return (false, InvalidReason.Expired, g.expiry);
        return (true, InvalidReason.Valid, g.expiry);
    }

    function hasValidRole(address account, Role role) external view returns (bool valid) {
        (valid, , ) = checkRole(account, role);
    }
}
