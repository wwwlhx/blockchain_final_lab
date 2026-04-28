import type { ContractTransactionReceipt } from "ethers";
import { network } from "hardhat";

import {
  getCurrentNetworkName,
  loadDeploymentConfig,
} from "../utils/config.js";

async function main() {
  const networkName = getCurrentNetworkName();
  const { ethers } = await network.getOrCreate(networkName);
  const deployment = await loadDeploymentConfig(networkName);

  const assetRegistry = await ethers.getContractAt(
    "AssetRegistry",
    deployment.contractAddress,
  );

  console.log("开始执行结构化资产演示交互...");

  const tx = await assetRegistry.registerAsset(
    "demo-file-hash",
    "demo-metadata-hash",
    "",
    "original",
  );
  const receipt = (await tx.wait()) as ContractTransactionReceipt;
  const registerEvent = receipt.logs
    .map((log) => {
      try {
        return assetRegistry.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsedLog) => parsedLog?.name === "AssetRegistered");

  const assetId = registerEvent?.args.assetId as bigint | undefined;
  if (!assetId) {
    throw new Error("未解析到 AssetRegistered 事件。");
  }

  const asset = await assetRegistry.getAsset(assetId);
  console.log("结构化资产登记成功");
  console.log("资产 ID:", asset.id.toString());
  console.log("文件哈希:", asset.fileHash);
  console.log("元数据哈希:", asset.metadataHash);
  console.log("权利类型:", asset.rightsType);
  console.log("创建者:", asset.creator);
  console.log("当前所有者:", asset.owner);
  console.log("登记时间:", asset.registeredAt.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
