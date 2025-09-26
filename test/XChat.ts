import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { XChat } from "../types";
import type { Signers } from "./types";

describe("XChat", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.alice = signers[1];
    this.signers.bob = signers[2];
    this.signers.carol = signers[3];
  });

  beforeEach(async function () {
    const contractFactory = await ethers.getContractFactory("XChat");
    this.xchat = await contractFactory.connect(this.signers.admin).deploy();
    await this.xchat.waitForDeployment();
    this.contractAddress = await this.xchat.getAddress();
  });

  it("should create a group successfully", async function () {
    const groupName = "Test Group";
    
    const tx = await this.xchat.connect(this.signers.alice).createGroup(groupName);
    const receipt = await tx.wait();
    
    expect(receipt).to.not.be.null;
    
    // Check group info
    const groupInfo = await this.xchat.getGroupInfo(0);
    expect(groupInfo[0]).to.equal(groupName);
    expect(groupInfo[1]).to.equal(this.signers.alice.address);
    expect(groupInfo[2]).to.equal(1n); // memberCount
    expect(groupInfo[3]).to.equal(0n); // messageCount
    
    // Check total groups
    const totalGroups = await this.xchat.getTotalGroups();
    expect(totalGroups).to.equal(1n);
  });

  it("should allow users to join a group", async function () {
    const groupName = "Test Group";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Bob joins the group
    await this.xchat.connect(this.signers.bob).joinGroup(0);
    
    // Check group info
    const groupInfo = await this.xchat.getGroupInfo(0);
    expect(groupInfo[2]).to.equal(2n); // memberCount should be 2
    
    // Check if Bob is a member
    const isBobMember = await this.xchat.isMember(0, this.signers.bob.address);
    expect(isBobMember).to.be.true;
    
    // Check group members
    const members = await this.xchat.getGroupMembers(0);
    expect(members).to.include(this.signers.alice.address);
    expect(members).to.include(this.signers.bob.address);
    expect(members.length).to.equal(2);
  });

  it("should send encrypted messages to group", async function () {
    const groupName = "Test Group";
    const encryptedMessage = "encrypted_message_content";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Bob joins the group
    await this.xchat.connect(this.signers.bob).joinGroup(0);
    
    // Create encrypted input for password address
    const input = fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.addAddress(this.signers.alice.address); // Using Alice's address as password
    const encryptedInput = await input.encrypt();
    
    // Send message from Alice
    const tx = await this.xchat.connect(this.signers.alice).sendMessage(
      0, // groupId
      encryptedMessage,
      encryptedInput.handles[0], // encrypted password address
      encryptedInput.inputProof
    );
    
    const receipt = await tx.wait();
    expect(receipt).to.not.be.null;
    
    // Check group message count
    const groupInfo = await this.xchat.getGroupInfo(0);
    expect(groupInfo[3]).to.equal(1n); // messageCount should be 1
    
    // Check total messages
    const totalMessages = await this.xchat.getTotalMessages();
    expect(totalMessages).to.equal(1n);
  });

  it("should retrieve message details for group members", async function () {
    const groupName = "Test Group";
    const encryptedMessage = "encrypted_message_content";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Bob joins the group
    await this.xchat.connect(this.signers.bob).joinGroup(0);
    
    // Create encrypted input for password address
    const input = fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.addAddress(this.signers.alice.address);
    const encryptedInput = await input.encrypt();
    
    // Send message from Alice
    await this.xchat.connect(this.signers.alice).sendMessage(
      0,
      encryptedMessage,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );
    
    // Alice can retrieve the message
    const messageAlice = await this.xchat.connect(this.signers.alice).getMessage(0);
    expect(messageAlice[0]).to.equal(0n); // groupId
    expect(messageAlice[1]).to.equal(this.signers.alice.address); // sender
    expect(messageAlice[2]).to.equal(encryptedMessage); // encryptedMessage
    
    // Bob can also retrieve the message (he's a group member)
    const messageBob = await this.xchat.connect(this.signers.bob).getMessage(0);
    expect(messageBob[0]).to.equal(0n); // groupId
    expect(messageBob[1]).to.equal(this.signers.alice.address); // sender
    expect(messageBob[2]).to.equal(encryptedMessage); // encryptedMessage
  });

  it("should prevent non-members from accessing messages", async function () {
    const groupName = "Test Group";
    const encryptedMessage = "encrypted_message_content";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Create encrypted input for password address
    const input = fhevm.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.addAddress(this.signers.alice.address);
    const encryptedInput = await input.encrypt();
    
    // Send message from Alice
    await this.xchat.connect(this.signers.alice).sendMessage(
      0,
      encryptedMessage,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );
    
    // Carol (not a group member) should not be able to access the message
    await expect(
      this.xchat.connect(this.signers.carol).getMessage(0)
    ).to.be.revertedWith("Not authorized to view this message");
  });

  it("should prevent non-members from sending messages", async function () {
    const groupName = "Test Group";
    const encryptedMessage = "encrypted_message_content";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Create encrypted input for password address
    const input = fhevm.createEncryptedInput(this.contractAddress, this.signers.carol.address);
    input.addAddress(this.signers.carol.address);
    const encryptedInput = await input.encrypt();
    
    // Carol (not a group member) should not be able to send a message
    await expect(
      this.xchat.connect(this.signers.carol).sendMessage(
        0,
        encryptedMessage,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Not a group member");
  });

  it("should prevent joining a group twice", async function () {
    const groupName = "Test Group";
    
    // Create group with Alice
    await this.xchat.connect(this.signers.alice).createGroup(groupName);
    
    // Bob joins the group
    await this.xchat.connect(this.signers.bob).joinGroup(0);
    
    // Bob tries to join again - should fail
    await expect(
      this.xchat.connect(this.signers.bob).joinGroup(0)
    ).to.be.revertedWith("Already a member");
  });

  it("should handle multiple groups correctly", async function () {
    // Alice creates first group
    await this.xchat.connect(this.signers.alice).createGroup("Group 1");
    
    // Bob creates second group
    await this.xchat.connect(this.signers.bob).createGroup("Group 2");
    
    // Check total groups
    const totalGroups = await this.xchat.getTotalGroups();
    expect(totalGroups).to.equal(2n);
    
    // Check group info
    const group1Info = await this.xchat.getGroupInfo(0);
    expect(group1Info[0]).to.equal("Group 1");
    expect(group1Info[1]).to.equal(this.signers.alice.address);
    
    const group2Info = await this.xchat.getGroupInfo(1);
    expect(group2Info[0]).to.equal("Group 2");
    expect(group2Info[1]).to.equal(this.signers.bob.address);
    
    // Carol joins both groups
    await this.xchat.connect(this.signers.carol).joinGroup(0);
    await this.xchat.connect(this.signers.carol).joinGroup(1);
    
    // Check if Carol is member of both groups
    const isCarolMemberGroup1 = await this.xchat.isMember(0, this.signers.carol.address);
    const isCarolMemberGroup2 = await this.xchat.isMember(1, this.signers.carol.address);
    expect(isCarolMemberGroup1).to.be.true;
    expect(isCarolMemberGroup2).to.be.true;
  });
});