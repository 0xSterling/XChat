import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Utilities for XChat
 */

task("xchat:address", "Prints the XChat address").setAction(async function (_: TaskArguments, hre) {
  const { deployments } = hre;
  const xchat = await deployments.get("XChat");
  console.log(`XChat address: ${xchat.address}`);
});

task("xchat:create", "Create a group with name and encrypted address password")
  .addParam("name", "Group name")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const dep = await deployments.get("XChat");
    const signers = await ethers.getSigners();
    const creator = signers[0];
    const contract = await ethers.getContractAt("XChat", dep.address);

    // Generate a random address-formatted password
    const wallet = ethers.Wallet.createRandom();
    const password = wallet.address;
    console.log(`Generated password (address): ${password}`);

    const encrypted = await fhevm
      .createEncryptedInput(dep.address, creator.address)
      .addAddress(password)
      .encrypt();

    const tx = await contract
      .connect(creator)
      .createGroup(args.name, encrypted.handles[0], encrypted.inputProof);
    console.log(`createGroup tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Group created.`);
  });

task("xchat:join", "Join a group")
  .addParam("id", "Group id")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const dep = await deployments.get("XChat");
    const [signer] = await ethers.getSigners();
    const contract = await ethers.getContractAt("XChat", dep.address);
    const tx = await contract.connect(signer).joinGroup(args.id);
    console.log(`joinGroup tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Joined group ${args.id}`);
  });

