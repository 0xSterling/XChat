// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title XChat - Encrypted group chat with FHE-stored group password
/// @notice Stores an encrypted group password (address format) per group and emits AES-encrypted messages
contract XChat is SepoliaConfig {
    struct Group {
        string name;
        address owner;
        eaddress passwordEnc; // Encrypted group password (address format)
        uint256 createdAt;
        uint256 memberCount;
    }

    // groupId => Group
    mapping(uint256 => Group) private groups;
    // groupId => member => joined
    mapping(uint256 => mapping(address => bool)) public isMember;

    uint256 public groupCount;

    event GroupCreated(uint256 indexed groupId, string name, address indexed owner);
    event GroupJoined(uint256 indexed groupId, address indexed member);
    event MessageSent(uint256 indexed groupId, address indexed sender, string ciphertext, uint256 timestamp);

    /// @notice Create a group with a name and an encrypted password (address format)
    /// @param name The group name
    /// @param passwordInput The external encrypted address input
    /// @param inputProof The proof for the external encrypted input
    function createGroup(
        string calldata name,
        externalEaddress passwordInput,
        bytes calldata inputProof
    ) external returns (uint256 groupId) {
        groupId = ++groupCount;

        eaddress encPass = FHE.fromExternal(passwordInput, inputProof);

        groups[groupId] = Group({
            name: name,
            owner: msg.sender,
            passwordEnc: encPass,
            createdAt: block.timestamp,
            memberCount: 0
        });

        // Owner is implicitly a member and must be allowed to decrypt the group password
        isMember[groupId][msg.sender] = true;
        groups[groupId].memberCount = 1;

        // Grant ACL permissions for the group password
        FHE.allowThis(encPass);
        FHE.allow(encPass, msg.sender);

        emit GroupCreated(groupId, name, msg.sender);
    }

    /// @notice Join a group; open join, grants decryption rights to the group password
    /// @param groupId The group identifier
    function joinGroup(uint256 groupId) external {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        if (isMember[groupId][msg.sender]) {
            return; // already a member; idempotent
        }

        isMember[groupId][msg.sender] = true;
        groups[groupId].memberCount += 1;

        // Allow new member to decrypt the group password
        FHE.allow(groups[groupId].passwordEnc, msg.sender);

        emit GroupJoined(groupId, msg.sender);
    }

    /// @notice Get basic group info without relying on msg.sender
    function getGroup(uint256 groupId)
        external
        view
        returns (string memory name, address owner, uint256 createdAt, uint256 memberCount)
    {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        Group storage g = groups[groupId];
        return (g.name, g.owner, g.createdAt, g.memberCount);
    }

    /// @notice Returns the encrypted group password handle (eaddress)
    function getGroupPassword(uint256 groupId) external view returns (eaddress) {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        return groups[groupId].passwordEnc;
    }

    /// @notice Returns whether a user is member of a group
    function getIsMember(uint256 groupId, address user) external view returns (bool) {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        return isMember[groupId][user];
    }

    /// @notice Send a message to a group; message must be AES-encrypted client-side with the group password
    /// @param groupId The group identifier
    /// @param ciphertext The AES-encrypted message blob encoded as string (e.g., JSON with iv + data)
    function sendMessage(uint256 groupId, string calldata ciphertext) external {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        require(isMember[groupId][msg.sender], "Not a member");
        emit MessageSent(groupId, msg.sender, ciphertext, block.timestamp);
    }
}

