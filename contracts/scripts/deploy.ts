import { network } from "hardhat";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

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

  // 导出 ABI + 部署信息到共享目录，供后端和前端使用
  const artifactPath = path.resolve("artifacts/contracts/AssetRegistry.sol/AssetRegistry.json");
  const artifact = JSON.parse(await readFile(artifactPath, "utf-8"));
  const sharedDir = path.resolve("deployments");
  await mkdir(sharedDir, { recursive: true });
  const sharedConfig = {
    network: networkName,
    contractAddress,
    deployedAt: new Date().toISOString(),
    rpcUrl: networkName === "localhost" ? "http://127.0.0.1:8545" : "",
    abi: artifact.abi,
  };
  const sharedPath = path.join(sharedDir, `${networkName}.json`);
  await writeFile(sharedPath, JSON.stringify(sharedConfig, null, 2), "utf-8");

  printBanner("数字资产确权系统原型 - 合约部署");
  printSection("部署结果");
  printStatus("SUCCESS", "升级后的 AssetRegistry 已成功部署。");
  printField("部署网络", networkName);
  printField("合约地址", contractAddress);
  printField("配置文件", configPath);
  printField("共享配置(含ABI)", sharedPath);
  printHint("后续 register:file / query:asset / verify:asset / transfer:asset / revoke:asset 会自动读取该地址。");
}

main().catch((error) => {
  printBanner("数字资产确权系统原型 - 合约部署");
  printStatus("ERROR", `部署失败: ${formatErrorMessage(error)}`);
  process.exitCode = 1;
});
