// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title IdentityRegistry
/// @notice Maps an on-chain account to its DID and lifecycle status. Holds no personal
/// data by design — name, employee number and department stay off-chain in Postgres,
/// so an erasure request only ever touches the off-chain record.
contract IdentityRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum Status {
        Unregistered,
        Active,
        Suspended,
        Retired
    }

    struct Identity {
        string did;
        Status status;
        uint64 registeredAt;
    }

    mapping(address => Identity) private _identities;

    event IdentityRegistered(address indexed account, string did, address indexed issuer);
    event IdentityStatusChanged(address indexed account, Status status, address indexed changedBy);

    error ZeroAddress();
    error EmptyDid();
    error AlreadyRegistered(address account);
    error NotRegistered(address account);

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    function register(address account, string calldata did) external onlyRole(ISSUER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        if (bytes(did).length == 0) revert EmptyDid();
        if (_identities[account].status != Status.Unregistered) revert AlreadyRegistered(account);
        _identities[account] = Identity({did: did, status: Status.Active, registeredAt: uint64(block.timestamp)});
        emit IdentityRegistered(account, did, msg.sender);
    }

    function setStatus(address account, Status status) external onlyRole(ISSUER_ROLE) {
        if (_identities[account].status == Status.Unregistered) revert NotRegistered(account);
        _identities[account].status = status;
        emit IdentityStatusChanged(account, status, msg.sender);
    }

    function get(address account) external view returns (Identity memory) {
        return _identities[account];
    }

    function isActive(address account) external view returns (bool) {
        return _identities[account].status == Status.Active;
    }
}
