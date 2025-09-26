import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  log(`Deployer: ${deployer}`);

  const deployed = await deploy("XChat", {
    from: deployer,
    log: true,
  });
  log(`XChat deployed at ${deployed.address}`);
};

export default func;
func.id = "deploy_xchat";
func.tags = ["XChat"];
