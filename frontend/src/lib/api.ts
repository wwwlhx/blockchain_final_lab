import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export interface Asset {
  id: number
  fileHash: string
  metadataHash: string
  metadataURI: string
  rightsType: string
  rightsTypeLabel?: string
  creator: string
  owner: string
  registeredAt: number
  registeredAtFormatted?: string
  status: number
  statusLabel: string
  metadata?: AssetMetadata
}

export interface AssetMetadata {
  metadataStandard: string
  metadataVersion: string
  assetName: string
  description: string
  assetCategory: string
  originalFileName: string
  fileExtension: string
  fileSize: number
  fileHash: string
  hashAlgorithm: string
  rightsType: string
  claimantAddress: string
  createdAtLocal: string
}

export interface HistoryEvent {
  type: 'REGISTERED' | 'TRANSFERRED' | 'REVOKED'
  blockNumber: number
  timestamp: number
  timestampFormatted: string
  transactionHash: string
  data: Record<string, string>
}

export interface VerifyResult {
  assetId: number
  chainFileHash: string
  localFileHash: string
  fileHashMatch: boolean
  chainMetadataHash: string
  localMetadataHash: string | null
  metadataHashMatch: boolean | null
  overallResult: boolean
  message: string
}

export interface TransactionDetails {
  transactionHash: string
  status: number
  blockNumber: number
  from: string
  to: string | null
  gasUsed: string
  gasPrice: string | null
  fee: string | null
  timestamp: number | null
  timestampFormatted: string | null
}

// API functions
export const getDeployment = () => api.get('/deployment')

export const getAssets = () => api.get<{ success: boolean; data: Asset[]; total: number }>('/assets')

export const getAsset = (id: number) => api.get<{ success: boolean; data: Asset }>(`/assets/${id}`)

export const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const registerAsset = (data: {
  filePath: string
  assetName: string
  description?: string
  rightsType?: string
  assetCategory?: string
}) => api.post('/assets/register', data)

export const prepareWalletRegistration = (data: {
  filePath: string
  assetName: string
  description?: string
  rightsType?: string
  assetCategory?: string
  claimantAddress: string
}) => api.post('/wallet/register/prepare', data)

export const confirmWalletRegistration = (data: {
  transactionHash: string
  assetName: string
  description?: string
  assetCategory?: string
}) => api.post('/wallet/register/confirm', data)

export const confirmWalletAction = (data: {
  transactionHash: string
  expectedType: 'TRANSFERRED' | 'REVOKED'
}) => api.post<{ success: boolean; data: TransactionDetails }>('/wallet/action/confirm', data)

export const getTransactionDetails = (hash: string) =>
  api.get<{ success: boolean; data: TransactionDetails }>(`/transactions/${hash}`)

export const syncChainIndex = () =>
  api.post<{ success: boolean; data: { assets: number; transfers: number; revocations: number; blockNumber: number } }>('/sync')

export const verifyAsset = (id: number, filePath: string, metadataPath?: string) =>
  api.post<{ success: boolean; data: VerifyResult }>(`/assets/${id}/verify`, { filePath, metadataPath })

export const transferAsset = (id: number, newOwner: string) =>
  api.post(`/assets/${id}/transfer`, { newOwner })

export const revokeAsset = (id: number) =>
  api.post(`/assets/${id}/revoke`)

export const getAssetHistory = (id: number) =>
  api.get<{ success: boolean; data: { assetId: number; history: HistoryEvent[]; totalEvents: number } }>(`/assets/${id}/history`)

export const getAccounts = () =>
  api.get<{ success: boolean; data: { index: number; address: string; label: string }[] }>('/accounts')

export interface SystemStats {
  totalAssets: number
  activeAssets: number
  revokedAssets: number
  totalTransactions: number
  totalVerifications: number
  passedVerifications: number
  recentLogs: { id: number; level: string; action: string; message: string; created_at: string }[]
  categoryDistribution: { name: string; value: number }[]
  transactionDistribution: { name: string; value: number }[]
  dailyRegistrations: { date: string; value: number }[]
}

export const getStats = () =>
  api.get<{ success: boolean; data: SystemStats }>('/stats')

export const getHealth = () =>
  api.get<{ status: string; chain: { connected: boolean; network: string; chainId: number; blockNumber: number; contractAddress: string; defaultAccount: string; balance: string } }>('/health')

export default api
