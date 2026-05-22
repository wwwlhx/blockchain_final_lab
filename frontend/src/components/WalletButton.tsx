import { motion } from 'framer-motion'
import { Wallet, AlertTriangle, LogOut } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { truncateAddress } from '../lib/utils'

export default function WalletButton() {
  const { connected, address, balance, isCorrectNetwork, connect, disconnect, switchToHardhat, isMetaMaskInstalled } = useWallet()

  if (!connected) {
    return (
      <motion.button
        onClick={connect}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blockchain-accent/10 border border-blockchain-accent/30 text-blockchain-accent text-sm font-medium hover:bg-blockchain-accent/20 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Wallet className="w-4 h-4" />
        {isMetaMaskInstalled ? '连接钱包' : '安装 MetaMask'}
      </motion.button>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <motion.button
        onClick={switchToHardhat}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AlertTriangle className="w-4 h-4" />
        切换到 Hardhat
      </motion.button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono text-green-300">{truncateAddress(address!)}</span>
        {balance && <span className="text-gray-500 text-xs">{balance}</span>}
      </div>
      <motion.button
        onClick={disconnect}
        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="断开连接"
      >
        <LogOut className="w-4 h-4" />
      </motion.button>
    </div>
  )
}
