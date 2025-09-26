import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("xchat:createGroup")
  .addParam("name", "Group name")
  .setDescription("Create a new group")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { name } = taskArguments;
    const signers = await ethers.getSigners();
    const deployer = signers[0];

    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    console.log(`Creating group "${name}" with deployer: ${deployer.address}`);

    const tx = await xchat.connect(deployer).createGroup(name);
    const receipt = await tx.wait();
    
    if (receipt?.logs) {
      const groupCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsedLog = xchat.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsedLog && parsedLog.name === "GroupCreated";
        } catch {
          return false;
        }
      });

      if (groupCreatedEvent) {
        const parsedLog = xchat.interface.parseLog({
          topics: groupCreatedEvent.topics,
          data: groupCreatedEvent.data,
        });
        console.log(`Group created successfully! Group ID: ${parsedLog?.args[0]}`);
      }
    }
  });

task("xchat:joinGroup")
  .addParam("groupid", "Group ID to join", undefined, undefined, true)
  .setDescription("Join an existing group")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { groupid } = taskArguments;
    const signers = await ethers.getSigners();
    const deployer = signers[0];

    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    console.log(`Joining group ${groupid} with address: ${deployer.address}`);

    const tx = await xchat.connect(deployer).joinGroup(parseInt(groupid));
    await tx.wait();
    
    console.log(`Successfully joined group ${groupid}!`);
  });

task("xchat:getGroupInfo")
  .addParam("groupid", "Group ID", undefined, undefined, true)
  .setDescription("Get group information")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { groupid } = taskArguments;

    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    console.log(`Getting info for group ${groupid}`);

    const groupInfo = await xchat.getGroupInfo(parseInt(groupid));
    
    console.log(`Group Name: ${groupInfo[0]}`);
    console.log(`Creator: ${groupInfo[1]}`);
    console.log(`Member Count: ${groupInfo[2]}`);
    console.log(`Message Count: ${groupInfo[3]}`);
  });

task("xchat:getGroupMembers")
  .addParam("groupid", "Group ID", undefined, undefined, true)
  .setDescription("Get group members")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { groupid } = taskArguments;

    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    console.log(`Getting members for group ${groupid}`);

    const members = await xchat.getGroupMembers(parseInt(groupid));
    
    console.log(`Group Members (${members.length}):`);
    members.forEach((member: string, index: number) => {
      console.log(`  ${index + 1}. ${member}`);
    });
  });

task("xchat:getTotalGroups")
  .setDescription("Get total number of groups")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    const totalGroups = await xchat.getTotalGroups();
    console.log(`Total Groups: ${totalGroups}`);
  });

task("xchat:getTotalMessages")
  .setDescription("Get total number of messages")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const xchatDeployment = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", xchatDeployment.address);

    const totalMessages = await xchat.getTotalMessages();
    console.log(`Total Messages: ${totalMessages}`);
  });