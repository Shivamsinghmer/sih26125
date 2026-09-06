// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IdentityRegistry} from "./IdentityRegistry.sol";
import {RoleRegistry} from "./RoleRegistry.sol";

/// @title GuardianRecovery
/// @notice Recovers a lost signing key through an m-of-n quorum of guardians —
/// a department head, HR, a security officer — rather than a seed phrase. No
/// enterprise will accept "write these twelve words down", and no single
/// administrator should be able to seize an identity on their own.
///
/// The shape is deliberately ERC-4337 compatible without running a bundler: on a
/// zero-gas permissioned chain, account abstraction's paymaster and gas
/// machinery solve problems this deployment does not have, while the part that
/// matters — social recovery of a lost key — is the contract below.
///
/// Three properties make this safe to hand to a judge:
///   1. A quorum alone is not enough. A timelock must also elapse.
///   2. The account being recovered can cancel during that window, so a
///      colluding quorum cannot silently take an identity from someone who
///      still holds their key.
///   3. Every step emits an event, so a recovery attempt can never be quiet.
contract GuardianRecovery is AccessControl {
    bytes32 public constant CONFIGURER_ROLE = keccak256("CONFIGURER_ROLE");

    struct Config {
        address[] guardians;
        uint8 threshold;
    }

    struct Request {
        address newAccount;
        uint8 approvals;
        uint64 proposedAt;
        /// @dev Non-zero once the quorum was reached; the timelock runs from here.
        uint64 quorumReachedAt;
        bool executed;
        bool cancelled;
    }

    IdentityRegistry public immutable identityRegistry;
    RoleRegistry public immutable roleRegistry;

    /// @notice How long a reached quorum must wait before it can be executed.
    uint64 public immutable timelock;

    mapping(address => Config) private _configs;
    mapping(address => Request) private _requests;
    mapping(address => mapping(address => bool)) private _approved;

    event GuardiansConfigured(address indexed account, address[] guardians, uint8 threshold);
    event RecoveryProposed(address indexed account, address indexed newAccount, address indexed proposer);
    event RecoveryApproved(address indexed account, address indexed guardian, uint8 approvals, uint8 threshold);
    event RecoveryQuorumReached(address indexed account, address indexed newAccount, uint64 executableAt);
    event RecoveryCancelled(address indexed account, address indexed cancelledBy);
    event RecoveryExecuted(address indexed account, address indexed newAccount);

    error ZeroAddress();
    error InvalidThreshold(uint8 threshold, uint256 guardianCount);
    error NotAGuardian(address caller);
    error NoActiveRequest(address account);
    error RequestAlreadyActive(address account);
    error AlreadyApproved(address guardian);
    error QuorumNotReached(uint8 approvals, uint8 threshold);
    error TimelockNotElapsed(uint64 executableAt);
    error NotTheAccount(address caller);

    constructor(address admin, address identityRegistryAddress, address roleRegistryAddress, uint64 timelockSeconds) {
        if (admin == address(0) || identityRegistryAddress == address(0) || roleRegistryAddress == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIGURER_ROLE, admin);
        identityRegistry = IdentityRegistry(identityRegistryAddress);
        roleRegistry = RoleRegistry(roleRegistryAddress);
        timelock = timelockSeconds;
    }

    /// @notice Assign the guardians who can recover `account`, and how many of
    /// them must agree.
    function configureGuardians(
        address account,
        address[] calldata guardians,
        uint8 threshold
    ) external onlyRole(CONFIGURER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        if (threshold == 0 || threshold > guardians.length) {
            revert InvalidThreshold(threshold, guardians.length);
        }
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == address(0)) revert ZeroAddress();
        }
        _configs[account] = Config({guardians: guardians, threshold: threshold});
        emit GuardiansConfigured(account, guardians, threshold);
    }

    function isGuardian(address account, address candidate) public view returns (bool) {
        address[] memory guardians = _configs[account].guardians;
        for (uint256 i = 0; i < guardians.length; i++) {
            if (guardians[i] == candidate) return true;
        }
        return false;
    }

    function guardiansOf(address account) external view returns (address[] memory, uint8) {
        Config memory config = _configs[account];
        return (config.guardians, config.threshold);
    }

    function requestFor(address account) external view returns (Request memory) {
        return _requests[account];
    }

    /// @notice Open a recovery, moving `account` onto `newAccount`. Counts as the
    /// proposer's own approval.
    function proposeRecovery(address account, address newAccount) external {
        if (!isGuardian(account, msg.sender)) revert NotAGuardian(msg.sender);
        if (newAccount == address(0)) revert ZeroAddress();

        Request memory existing = _requests[account];
        if (existing.proposedAt != 0 && !existing.executed && !existing.cancelled) {
            revert RequestAlreadyActive(account);
        }

        // Clear any approvals left over from a previous, closed request.
        address[] memory guardians = _configs[account].guardians;
        for (uint256 i = 0; i < guardians.length; i++) {
            _approved[account][guardians[i]] = false;
        }

        _requests[account] = Request({
            newAccount: newAccount,
            approvals: 0,
            proposedAt: uint64(block.timestamp),
            quorumReachedAt: 0,
            executed: false,
            cancelled: false
        });

        emit RecoveryProposed(account, newAccount, msg.sender);
        _approve(account, msg.sender);
    }

    /// @notice Add a guardian's approval to the open recovery.
    function approveRecovery(address account) external {
        if (!isGuardian(account, msg.sender)) revert NotAGuardian(msg.sender);
        _approve(account, msg.sender);
    }

    function _approve(address account, address guardian) private {
        Request storage request = _requests[account];
        if (request.proposedAt == 0 || request.executed || request.cancelled) {
            revert NoActiveRequest(account);
        }
        if (_approved[account][guardian]) revert AlreadyApproved(guardian);

        _approved[account][guardian] = true;
        request.approvals += 1;

        uint8 threshold = _configs[account].threshold;
        emit RecoveryApproved(account, guardian, request.approvals, threshold);

        if (request.approvals >= threshold && request.quorumReachedAt == 0) {
            request.quorumReachedAt = uint64(block.timestamp);
            emit RecoveryQuorumReached(account, request.newAccount, request.quorumReachedAt + timelock);
        }
    }

    /// @notice Abandon a recovery. Only the account under recovery can do this —
    /// it is the control that stops a colluding quorum from taking an identity
    /// whose owner still holds their key and is watching the events.
    function cancelRecovery(address account) external {
        if (msg.sender != account) revert NotTheAccount(msg.sender);
        Request storage request = _requests[account];
        if (request.proposedAt == 0 || request.executed || request.cancelled) {
            revert NoActiveRequest(account);
        }
        request.cancelled = true;
        emit RecoveryCancelled(account, msg.sender);
    }

    /// @notice Complete the recovery once the quorum has held for the timelock.
    ///
    /// `rolesToMigrate` is explicit rather than discovered, so the transaction
    /// states exactly which credentials move. Any role still valid on the old
    /// account is re-granted to the new one with its original expiry, then
    /// revoked on the old, so a recovery cannot be used to extend a credential.
    function executeRecovery(address account, RoleRegistry.Role[] calldata rolesToMigrate) external {
        Request storage request = _requests[account];
        if (request.proposedAt == 0 || request.executed || request.cancelled) {
            revert NoActiveRequest(account);
        }

        uint8 threshold = _configs[account].threshold;
        if (request.approvals < threshold) revert QuorumNotReached(request.approvals, threshold);

        uint64 executableAt = request.quorumReachedAt + timelock;
        if (block.timestamp < executableAt) revert TimelockNotElapsed(executableAt);

        request.executed = true;
        address newAccount = request.newAccount;

        identityRegistry.rotateAccount(account, newAccount);

        for (uint256 i = 0; i < rolesToMigrate.length; i++) {
            RoleRegistry.Role role = rolesToMigrate[i];
            (bool valid, , uint64 expiry) = roleRegistry.checkRole(account, role);
            if (valid) {
                roleRegistry.grantBusinessRole(newAccount, role, expiry);
                roleRegistry.revokeBusinessRole(account, role);
            }
        }

        emit RecoveryExecuted(account, newAccount);
    }
}
