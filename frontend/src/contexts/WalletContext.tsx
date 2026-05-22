import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'
import { HARDHAT_CHAIN_ID, HARDHAT_RPC_URL, loadContractConfig } from '../config/contract'

interface WalletState {
  connected: boolean
  address: string | null
  chainId: number | null
  balance: string | null
  isCorrectNetwork: boolean
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  contract: ethers.Contract | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchToHardhat: () => Promise<void>
  isMetaMaskInstalled: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    chainId: null,
    balance: null,
    isCorrectNetwork: false,
    provider: null,
    signer: null,
    contract: null,
  })

  const isMetaMaskInstalled = typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask

  const updateBalance = useCallback(async (provider: ethers.BrowserProvider, address: string) => {
    try {
      const bal = await provider.getBalance(address)
      return `${parseFloat(ethers.formatEther(bal)).toFixed(4)} ETH`
    } catch {
      return null
    }
  }, [])

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    const ethereum = (window as any).ethereum
    const provider = new ethers.BrowserProvider(ethereum)

    const accounts = await provider.send('eth_requestAccounts', [])
    if (!accounts.length) return

    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    const network = await provider.getNetwork()
    const chainId = Number(network.chainId)
    const balance = await updateBalance(provider, address)
    const isCorrectNetwork = chainId === HARDHAT_CHAIN_ID

    let contract: ethers.Contract | null = null
    if (isCorrectNetwork) {
      try {
        const cfg = await loadContractConfig()
        contract = new ethers.Contract(cfg.contractAddress, cfg.abi, signer)
      } catch {}
    }

    setState({
      connected: true,
      address,
      chainId,
      balance,
      isCorrectNetwork,
      provider,
      signer,
      contract,
    })
  }, [isMetaMaskInstalled, updateBalance])

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      chainId: null,
      balance: null,
      isCorrectNetwork: false,
      provider: null,
      signer: null,
      contract: null,
    })
  }, [])

  const switchToHardhat = useCallback(async () => {
    if (!isMetaMaskInstalled) return
    const ethereum = (window as any).ethereum
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${HARDHAT_CHAIN_ID.toString(16)}` }],
      })
    } catch (err: any) {
      if (err.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${HARDHAT_CHAIN_ID.toString(16)}`,
            chainName: 'Hardhat Localhost',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [HARDHAT_RPC_URL],
          }],
        })
      }
    }
  }, [isMetaMaskInstalled])

  // Listen for account/network changes
  useEffect(() => {
    if (!isMetaMaskInstalled) return
    const ethereum = (window as any).ethereum

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect()
      else connect()
    }
    const handleChainChanged = () => connect()

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [isMetaMaskInstalled, connect, disconnect])

  // Auto-connect if previously connected
  useEffect(() => {
    if (!isMetaMaskInstalled) return
    const ethereum = (window as any).ethereum
    ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts.length > 0) connect()
    })
  }, [])

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, switchToHardhat, isMetaMaskInstalled }}>
      {children}
    </WalletContext.Provider>
  )
}
