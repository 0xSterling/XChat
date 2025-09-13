// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, eaddress, externalEuint256, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title XChat - Encrypted Group Chat Contract
/// @author XChat Team
/// @notice A confidential group chat system using FHEVM for encrypted messaging
contract XChat is SepoliaConfig {
    
    struct Group {
        string name;
        address creator;
        uint256 memberCount;
        mapping(address => bool) isMember;
        address[] members;
        uint256 messageCount;
    }
    
    struct Message {
        uint256 groupId;
        address sender;
        string encryptedMessage; // AES encrypted message
        eaddress encryptedPasswordAddress; // Zama encrypted password address
        uint256 timestamp;
    }
    
    uint256 public groupCounter;
    uint256 public messageCounter;
    
    mapping(uint256 => Group) public groups;
    mapping(uint256 => Message) public messages;
    
    // Events
    event GroupCreated(uint256 indexed groupId, string name, address indexed creator);
    event MemberJoined(uint256 indexed groupId, address indexed member);
    event MessageSent(
        uint256 indexed messageId, 
        uint256 indexed groupId, 
        address indexed sender, 
        string encryptedMessage,
        uint256 timestamp
    );
    
    /// @notice Create a new group with a name
    /// @param name The name of the group
    /// @return groupId The ID of the created group
    function createGroup(string calldata name) external returns (uint256) {
        require(bytes(name).length > 0, "Group name cannot be empty");
        
        uint256 groupId = groupCounter++;
        
        Group storage group = groups[groupId];
        group.name = name;
        group.creator = msg.sender;
        group.memberCount = 1;
        group.isMember[msg.sender] = true;
        group.members.push(msg.sender);
        
        emit GroupCreated(groupId, name, msg.sender);
        emit MemberJoined(groupId, msg.sender);
        
        return groupId;
    }
    
    /// @notice Join an existing group
    /// @param groupId The ID of the group to join
    function joinGroup(uint256 groupId) external {
        require(groupId < groupCounter, "Group does not exist");
        require(!groups[groupId].isMember[msg.sender], "Already a member");
        
        Group storage group = groups[groupId];
        group.isMember[msg.sender] = true;
        group.members.push(msg.sender);
        group.memberCount++;
        
        emit MemberJoined(groupId, msg.sender);
    }
    
    /// @notice Send an encrypted message to a group
    /// @param groupId The ID of the group to send message to
    /// @param encryptedMessage The AES encrypted message content
    /// @param encryptedPasswordAddress The Zama encrypted password address
    /// @param inputProof The input proof for the encrypted address
    function sendMessage(
        uint256 groupId,
        string calldata encryptedMessage,
        externalEaddress encryptedPasswordAddress,
        bytes calldata inputProof
    ) external {
        require(groupId < groupCounter, "Group does not exist");
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        require(bytes(encryptedMessage).length > 0, "Message cannot be empty");
        
        uint256 messageId = messageCounter++;
        
        // Convert external encrypted address to internal type
        eaddress internalEncryptedAddress = FHE.fromExternal(encryptedPasswordAddress, inputProof);
        
        Message storage message = messages[messageId];
        message.groupId = groupId;
        message.sender = msg.sender;
        message.encryptedMessage = encryptedMessage;
        message.encryptedPasswordAddress = internalEncryptedAddress;
        message.timestamp = block.timestamp;
        
        groups[groupId].messageCount++;
        
        // Grant access to the encrypted password address to all group members
        FHE.allowThis(internalEncryptedAddress);
        
        Group storage group = groups[groupId];
        for (uint256 i = 0; i < group.members.length; i++) {
            FHE.allow(internalEncryptedAddress, group.members[i]);
        }
        
        emit MessageSent(messageId, groupId, msg.sender, encryptedMessage, block.timestamp);
    }
    
    /// @notice Get group information
    /// @param groupId The ID of the group
    /// @return name The group name
    /// @return creator The group creator address
    /// @return memberCount The number of members in the group
    /// @return messageCount The number of messages in the group
    function getGroupInfo(uint256 groupId) external view returns (
        string memory name,
        address creator,
        uint256 memberCount,
        uint256 messageCount
    ) {
        require(groupId < groupCounter, "Group does not exist");
        
        Group storage group = groups[groupId];
        return (group.name, group.creator, group.memberCount, group.messageCount);
    }
    
    /// @notice Check if an address is a member of a group
    /// @param groupId The ID of the group
    /// @param user The address to check
    /// @return True if the user is a member, false otherwise
    function isMember(uint256 groupId, address user) external view returns (bool) {
        require(groupId < groupCounter, "Group does not exist");
        return groups[groupId].isMember[user];
    }
    
    /// @notice Get all members of a group
    /// @param groupId The ID of the group
    /// @return members Array of member addresses
    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        require(groupId < groupCounter, "Group does not exist");
        return groups[groupId].members;
    }
    
    /// @notice Get message details (accessible by group members)
    /// @param messageId The ID of the message
    /// @return groupId The group ID
    /// @return sender The sender address
    /// @return encryptedMessage The encrypted message content
    /// @return encryptedPasswordAddress The encrypted password address
    /// @return timestamp The message timestamp
    function getMessage(uint256 messageId) external view returns (
        uint256 groupId,
        address sender,
        string memory encryptedMessage,
        eaddress encryptedPasswordAddress,
        uint256 timestamp
    ) {
        require(messageId < messageCounter, "Message does not exist");
        
        Message storage message = messages[messageId];
        require(groups[message.groupId].isMember[msg.sender], "Not authorized to view this message");
        
        return (
            message.groupId,
            message.sender,
            message.encryptedMessage,
            message.encryptedPasswordAddress,
            message.timestamp
        );
    }
    
    /// @notice Get the total number of groups
    /// @return The total number of groups created
    function getTotalGroups() external view returns (uint256) {
        return groupCounter;
    }
    
    /// @notice Get the total number of messages
    /// @return The total number of messages sent
    function getTotalMessages() external view returns (uint256) {
        return messageCounter;
    }
}