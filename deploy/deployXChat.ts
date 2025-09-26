import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying XChat contract with deployer:", deployer);

  const xchat = await deploy("XChat", {
    from: deployer,
    args: [], // No constructor arguments needed
    log: true,
    waitConfirmations: 1,
  });

  console.log(`XChat contract deployed to: ${xchat.address}`);
  console.log(`Transaction hash: ${xchat.transactionHash}`);

  // Verify contract on Etherscan (if on mainnet/testnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "anvil") {
    console.log("Waiting for block confirmations...");
    await hre.ethers.provider.waitForTransaction(xchat.transactionHash!, 6);
    
    try {
      await hre.run("verify:verify", {
        address: xchat.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }
};

export default func;
func.tags = ["XChat"];