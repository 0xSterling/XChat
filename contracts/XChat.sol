// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {CoprocessorConfig} from "@fhevm/solidity/lib/Impl.sol";

/// @title XChat - Encrypted group chat with FHE-stored group password
/// @notice Stores an encrypted group password (address format) per group and emits AES-encrypted messages
contract XChat {
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

    struct Message {
        address sender;
        string ciphertext;
        uint256 timestamp;
    }

    // Stored messages by group
    mapping(uint256 => Message[]) private groupMessages;

    event GroupCreated(uint256 indexed groupId, string name, address indexed owner);
    event GroupJoined(uint256 indexed groupId, address indexed member);
    event MessageSent(uint256 indexed groupId, address indexed sender, string ciphertext, uint256 timestamp);

    constructor() {
        // Set Zama Sepolia coprocessor config directly (avoids SepoliaConfig import issues)
        FHE.setCoprocessor(
            CoprocessorConfig({
                ACLAddress: 0x687820221192C5B662b25367F70076A37bc79b6c,
                CoprocessorAddress: 0x848B0066793BcC60346Da1F49049357399B8D595,
                DecryptionOracleAddress: 0xa02Cda4Ca3a71D7C46997716F4283aa851C28812,
                KMSVerifierAddress: 0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC
            })
        );
    }

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
        // Store on-chain for historical reads
        groupMessages[groupId].push(Message({sender: msg.sender, ciphertext: ciphertext, timestamp: block.timestamp}));
        emit MessageSent(groupId, msg.sender, ciphertext, block.timestamp);
    }

    /// @notice Returns number of stored messages for a group
    function getMessageCount(uint256 groupId) external view returns (uint256) {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        return groupMessages[groupId].length;
    }

    /// @notice Returns a range of messages for a group
    /// @param groupId The group identifier
    /// @param offset Start index (0-based)
    /// @param limit Max number of messages to return
    function getMessages(
        uint256 groupId,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory senders, string[] memory ciphertexts, uint256[] memory timestamps) {
        require(groupId > 0 && groupId <= groupCount, "Invalid groupId");
        Message[] storage msgs = groupMessages[groupId];
        if (offset > msgs.length) {
            return (new address[](0), new string[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > msgs.length) {
            end = msgs.length;
        }
        uint256 len = end - offset;
        senders = new address[](len);
        ciphertexts = new string[](len);
        timestamps = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            Message storage m = msgs[offset + i];
            senders[i] = m.sender;
            ciphertexts[i] = m.ciphertext;
            timestamps[i] = m.timestamp;
        }
    }
}
