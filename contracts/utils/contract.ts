import { network } from "hardhat";

import { loadDeploymentConfig } from "./config.js";

export async function connectToAssetRegistry(networkName: string) {
  const deployment = await loadDeploymentConfig(networkName);

  let ethersConnection;
  try {
    ethersConnection = await network.getOrCreate(networkName);
  } catch {
    throw new Error(
      "无法连接到 Hardhat 网络。请确认本地链已经启动，并且 --network 参数与部署网络一致。",
    );
  }

  const { ethers } = ethersConnection;

  try {
    const assetRegistry = await ethers.getContractAt(
      "AssetRegistry",
      deployment.contractAddress,
    );

    return {
      assetRegistry,
      deployment,
      ethers,
    };
  } catch {
    throw new Error(
      "合约实例初始化失败。请检查部署地址是否正确，并确认当前网络上已部署 AssetRegistry 合约。",
    );
  }
}
