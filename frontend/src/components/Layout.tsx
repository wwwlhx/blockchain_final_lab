import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  FileUp, 
  Search, 
  ShieldCheck, 
  ArrowRightLeft,
  Blocks,
  Wifi,
  WifiOff,
  Network
} from 'lucide-react'
import api from '../lib/api'
import { truncateAddress } from '../lib/utils'
import WalletButton from './WalletButton'

interface LayoutProps {
  children: ReactNode
}

interface ChainStatus {
  connected: boolean
  network?: string
  chainId?: number
  blockNumber?: number
  contractAddress?: string
  defaultAccount?: string
  balance?: string
}

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard, desc: '系统概览' },
  { path: '/register', label: '资产登记', icon: FileUp, desc: '上链确权' },
  { path: '/query', label: '资产查询', icon: Search, desc: '链上查询' },
  { path: '/verify', label: '资产校验', icon: ShieldCheck, desc: '完整性验证' },
  { path: '/transfer', label: '权属转移', icon: ArrowRightLeft, desc: '变更所有权' },
  { path: '/architecture', label: '系统架构', icon: Network, desc: '技术说明' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [chainStatus, setChainStatus] = useState<ChainStatus>({ connected: false })
  const [statusPulse, setStatusPulse] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get('/health')
        setChainStatus(res.data.chain || { connected: false })
        setStatusPulse(true)
        setTimeout(() => setStatusPulse(false), 1000)
      } catch {
        setChainStatus({ connected: false })
      }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen blockchain-grid">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 glass border-r border-white/5 z-50 hidden lg:flex flex-col">
        <div className="p-5 flex-1">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8 group">
            <motion.div
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Blocks className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="font-bold text-lg gradient-text leading-tight">数字资产确权</h1>
              <p className="text-[11px] text-gray-500 tracking-wide">BLOCKCHAIN REGISTRY</p>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path))
              const Icon = item.icon
              
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-blockchain-accent/15 text-blockchain-accent' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-blockchain-accent"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className="w-[18px] h-[18px]" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-[10px] text-gray-600 group-hover:text-gray-500">{item.desc}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 rounded-full bg-blockchain-accent"
                      />
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* Chain Status Footer */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              {chainStatus.connected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <motion.div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${chainStatus.connected ? 'bg-green-400' : 'bg-red-400'}`}
                animate={statusPulse ? { scale: [1, 1.8, 1], opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.6 }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${chainStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                {chainStatus.connected ? 'Localhost 已连接' : '链未连接'}
              </p>
              {chainStatus.defaultAccount && (
                <p className="text-[10px] text-gray-500 font-mono truncate">
                  {truncateAddress(chainStatus.defaultAccount)}
                </p>
              )}
            </div>
            {chainStatus.balance && (
              <span className="text-[10px] text-gray-500 font-mono">{chainStatus.balance}</span>
            )}
          </div>
          <div className="text-[10px] text-gray-600 flex items-center justify-between">
            <span>{chainStatus.blockNumber != null ? `区块高度 #${chainStatus.blockNumber}` : '三层结构化确权模型'}</span>
            <span className="text-blockchain-accent font-medium">v1.0</span>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="min-h-screen pb-20 lg:ml-64 lg:pb-0">
        {/* Top bar with wallet */}
        <div className="sticky top-0 z-40 glass border-b border-white/5 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between lg:justify-end">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Blocks className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">数字资产确权</p>
              <p className="text-[9px] text-gray-500 mt-1">TRUSTED REGISTRY</p>
            </div>
          </Link>
          <WalletButton />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-6 rounded-2xl border border-white/10 bg-[#1b1e2c]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] ${
                isActive ? 'bg-blockchain-accent/15 text-blockchain-accent' : 'text-gray-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label.replace('资产', '')}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
