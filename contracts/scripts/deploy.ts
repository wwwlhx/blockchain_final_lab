import { network } from "hardhat";

import {
  formatErrorMessage,
  printBanner,
  printField,
  printHint,
  printSection,
  printStatus,
} from "../utils/cli.js";
import { getCurrentNetworkName, saveDeploymentConfig } from "../utils/config.js";

async function main() {
  const networkName = getCurrentNetworkName();
  const { ethers } = await network.getOrCreate(networkName);

  const assetRegistry = await ethers.deployContract("AssetRegistry");
  await assetRegistry.waitForDeployment();

  const contractAddress = await assetRegistry.getAddress();
  const configPath = await saveDeploymentConfig(networkName, contractAddress);

  printBanner("数字资产确权系统原型 - 合约部署");
  printSection("部署结果");
  printStatus("SUCCESS", "升级后的 AssetRegistry 已成功部署。");
  printField("部署网络", networkName);
  printField("合约地址", contractAddress);
  printField("配置文件", configPath);
  printHint("后续 register:file / query:asset / verify:asset / transfer:asset / revoke:asset 会自动读取该地址。");
}

main().catch((error) => {
  printBanner("数字资产确权系统原型 - 合约部署");
  printStatus("ERROR", `部署失败: ${formatErrorMessage(error)}`);
  process.exitCode = 1;
});
