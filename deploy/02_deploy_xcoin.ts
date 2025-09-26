import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  log(`Deployer: ${deployer}`);
  const deployed = await deploy("ConfidentialXCoin", {
    from: deployer,
    log: true,
  });
  log(`ConfidentialXCoin deployed at ${deployed.address}`);
};

export default func;
func.id = "deploy_xcoin";
func.tags = ["XCoin"];

