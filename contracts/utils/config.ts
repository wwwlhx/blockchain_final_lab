import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isAddress } from "ethers";

export interface DeploymentConfig {
  network: string;
  contractAddress: string;
  deployedAt: string;
}

const DEPLOYMENTS_DIR = path.resolve("deployments");

export function getCurrentNetworkName(): string {
  return process.env.HARDHAT_NETWORK ?? "localhost";
}

function getDeploymentFilePath(networkName: string): string {
  return path.join(DEPLOYMENTS_DIR, `${networkName}.json`);
}

export async function saveDeploymentConfig(
  networkName: string,
  contractAddress: string,
): Promise<string> {
  if (!isAddress(contractAddress)) {
    throw new Error(`部署地址格式错误: ${contractAddress}`);
  }

  await mkdir(DEPLOYMENTS_DIR, { recursive: true });

  const filePath = getDeploymentFilePath(networkName);
  const config: DeploymentConfig = {
    network: networkName,
    contractAddress,
    deployedAt: new Date().toISOString(),
  };

  await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
  return filePath;
}

export async function loadDeploymentConfig(
  networkName = getCurrentNetworkName(),
): Promise<DeploymentConfig> {
  const filePath = getDeploymentFilePath(networkName);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    throw new Error(
      [
        `未找到网络 ${networkName} 的合约配置文件。`,
        `请先执行部署脚本，并确认配置文件存在于: ${filePath}`,
      ].join(" "),
    );
  }

  let config: DeploymentConfig;
  try {
    config = JSON.parse(raw) as DeploymentConfig;
  } catch {
    throw new Error(`合约配置文件不是合法 JSON: ${filePath}`);
  }

  if (!config.contractAddress || !isAddress(config.contractAddress)) {
    throw new Error(
      `合约地址未配置或格式错误，请检查文件: ${filePath}`,
    );
  }

  return config;
}
