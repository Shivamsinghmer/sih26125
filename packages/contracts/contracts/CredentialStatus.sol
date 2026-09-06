// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CredentialStatus
/// @notice Anchors a W3C Bitstring Status List on chain, so revoking a
/// credential is one bit flip and checking one is a single cheap read.
///
/// The alternative — a list of revoked credential identifiers — grows without
/// bound and costs more to search the longer the system runs. A bitstring is
/// fixed-cost forever: credential 4,417 is bit 4,417, whether the registry
/// holds a thousand credentials or a million.
///
/// This complements RoleRegistry rather than duplicating it. RoleRegistry is
/// what `AssetToken._update` consults to gate a transfer; this is what an
/// external verifier consults to check a credential it was handed, following
/// the `credentialStatus` field of the W3C VC data model.
contract CredentialStatus is AccessControl {
    bytes32 public constant STATUS_WRITER_ROLE = keccak256("STATUS_WRITER_ROLE");

    /// @dev listId => word index => 256 status bits.
    mapping(uint256 => mapping(uint256 => uint256)) private _lists;

    /// @dev Highest index ever written per list, so a verifier can tell an
    /// unallocated credential from an unrevoked one.
    mapping(uint256 => uint256) public highestIndex;

    event StatusListCreated(uint256 indexed listId, string purpose, address indexed creator);
    event StatusChanged(uint256 indexed listId, uint256 indexed index, bool revoked, address indexed changedBy);

    error ZeroAddress();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STATUS_WRITER_ROLE, admin);
    }

    /// @notice Announce a status list. Purely an event — the storage is created
    /// lazily on first write — but it gives an indexer something to key on.
    function createStatusList(uint256 listId, string calldata purpose)
        external
        onlyRole(STATUS_WRITER_ROLE)
    {
        emit StatusListCreated(listId, purpose, msg.sender);
    }

    /// @notice Set or clear the revocation bit for one credential.
    function setStatus(uint256 listId, uint256 index, bool revoked)
        external
        onlyRole(STATUS_WRITER_ROLE)
    {
        uint256 word = index >> 8; // index / 256
        uint256 bit = index & 0xff; // index % 256
        uint256 mask = uint256(1) << bit;

        if (revoked) {
            _lists[listId][word] |= mask;
        } else {
            _lists[listId][word] &= ~mask;
        }

        if (index > highestIndex[listId]) highestIndex[listId] = index;

        emit StatusChanged(listId, index, revoked, msg.sender);
    }

    /// @notice Revoke many credentials in one transaction — the offboarding case.
    function setManyRevoked(uint256 listId, uint256[] calldata indices)
        external
        onlyRole(STATUS_WRITER_ROLE)
    {
        for (uint256 i = 0; i < indices.length; i++) {
            uint256 index = indices[i];
            _lists[listId][index >> 8] |= (uint256(1) << (index & 0xff));
            if (index > highestIndex[listId]) highestIndex[listId] = index;
            emit StatusChanged(listId, index, true, msg.sender);
        }
    }

    /// @notice True when the credential at `index` has been revoked.
    function isRevoked(uint256 listId, uint256 index) external view returns (bool) {
        return (_lists[listId][index >> 8] >> (index & 0xff)) & 1 == 1;
    }

    /// @notice A whole 256-bit word, so a verifier can snapshot a range of the
    /// list in one call instead of 256 of them.
    function statusWord(uint256 listId, uint256 wordIndex) external view returns (uint256) {
        return _lists[listId][wordIndex];
    }
}
