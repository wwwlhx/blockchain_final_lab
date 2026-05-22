import { ethers } from "ethers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config/index.js";
import { BlockchainError } from "../utils/errors.js";

// ── 部署配置（含 ABI）──
export interface DeploymentConfig {
  network: string;
  contractAddress: string;
  deployedAt: string;
  rpcUrl: string;
  abi: any[];
}

let _deploymentCache: DeploymentConfig | null = null;

export async function loadDeploymentConfig(): Promise<DeploymentConfig> {
  if (_deploymentCache) return _deploymentCache;
  const filePath = path.join(config.contractsDir, "deployments", `${config.network}.json`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new BlockchainError(`未找到部署配置: ${filePath}，请先执行合约部署`);
  }
  _deploymentCache = JSON.parse(raw);
  return _deploymentCache!;
}

// ── 合约连接缓存（纯 ethers，无 Hardhat 依赖）──
let _contractCache: {
  provider: ethers.JsonRpcProvider;
  assetRegistry: ethers.Contract;
  signers: ethers.JsonRpcSigner[];
} | null = null;

export async function getContract() {
  if (_contractCache) return _contractCache;

  const deployment = await loadDeploymentConfig();
  const rpcUrl = deployment.rpcUrl || config.rpcUrl;

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // 测试连接
  try {
    await provider.getBlockNumber();
  } catch {
    throw new BlockchainError(`无法连接到区块链节点: ${rpcUrl}`);
  }

  // 获取签名者（Hardhat 本地节点支持 eth_accounts）
  const accounts = await provider.listAccounts();
  const signers = accounts as ethers.JsonRpcSigner[];

  const assetRegistry = new ethers.Contract(
    deployment.contractAddress,
    deployment.abi,
    signers[0] // 默认使用第一个签名者
  );

  _contractCache = { provider, assetRegistry, signers };
  return _contractCache;
}

// ── 预热缓存 ──
export async function warmUp(): Promise<void> {
  await getContract();
}
