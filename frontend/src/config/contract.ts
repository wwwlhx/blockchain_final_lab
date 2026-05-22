// 合约配置 - 从部署文件加载 ABI 和地址
export const HARDHAT_CHAIN_ID = 31337
export const HARDHAT_RPC_URL = 'http://127.0.0.1:8545'

export interface ContractConfig {
  network: string
  contractAddress: string
  rpcUrl: string
  abi: any[]
}

let _configCache: ContractConfig | null = null

export async function loadContractConfig(): Promise<ContractConfig> {
  if (_configCache) return _configCache
  const res = await fetch('/api/deployment')
  const data = await res.json()
  if (!data.success) throw new Error('无法加载合约配置')
  _configCache = data.data as ContractConfig
  return _configCache
}
