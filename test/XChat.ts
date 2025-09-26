import { expect } from "chai";
import { ethers, deployments, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("XChat", function () {
  beforeEach(async function () {
    await deployments.fixture(["XChat"]);
  });

  it("creates group, joins, decrypts password, and sends message", async function () {
    await fhevm.initializeCLIApi();
    const [owner, alice] = await ethers.getSigners();

    const dep = await deployments.get("XChat");
    const xchat = await ethers.getContractAt("XChat", dep.address);

    // Generate address-formatted password and encrypt as external input
    const wallet = ethers.Wallet.createRandom();
    const password = wallet.address;

    const enc = await fhevm
      .createEncryptedInput(dep.address, owner.address)
      .addAddress(password)
      .encrypt();

    const txCreate = await xchat.connect(owner).createGroup("my-group", enc.handles[0], enc.inputProof);
    await txCreate.wait();

    const groupCount = await xchat.groupCount();
    expect(groupCount).to.equal(1n);

    // Alice joins
    const txJoin = await xchat.connect(alice).joinGroup(1);
    await txJoin.wait();

    // Alice reads encrypted group password
    const encryptedPass = await xchat.getGroupPassword(1);

    // Alice user-decrypts
    const clear = await fhevm.userDecryptEaddress(
      FhevmType.eaddress,
      encryptedPass,
      dep.address,
      alice,
    );
    expect(clear.toLowerCase()).to.equal(password.toLowerCase());

    // Send message event
    const messageBlob = JSON.stringify({ iv: "00", data: "deadbeef" });
    await expect(xchat.connect(alice).sendMessage(1, messageBlob))
      .to.emit(xchat, "MessageSent")
      .withArgs(1, alice.address, messageBlob, anyUint);
  });
});

// Helper for matching any uint in event assertion
const anyUint = (value: any) => true;

