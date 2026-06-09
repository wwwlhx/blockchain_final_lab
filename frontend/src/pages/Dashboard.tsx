import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { 
  Blocks, FileCheck, ArrowRightLeft, Shield, 
  ChevronRight, Loader2, RefreshCw, Hash, Database,
  Lock, Fingerprint, FileText, Activity, CheckCircle2,
  Clock, Sparkles, Network, Zap, ArrowUpRight
} from 'lucide-react'
import { getAssets, getStats, getHealth, syncChainIndex, Asset, SystemStats } from '../lib/api'
import { truncateHash } from '../lib/utils'
import toast from 'react-hot-toast'

function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, { duration })
    const unsubscribe = rounded.on('change', (v) => setDisplay(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, duration])

  return <span>{display}</span>
}

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [chainInfo, setChainInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [assetsRes, statsRes, healthRes] = await Promise.all([
        getAssets(),
        getStats(),
        getHealth(),
      ])
      if (assetsRes.data.success) setAssets(assetsRes.data.data)
      if (statsRes.data.success) setStats(statsRes.data.data)
      setChainInfo(healthRes.data.chain)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchAll()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await syncChainIndex()
      toast.success(`已重建 ${res.data.data.assets} 条链上资产索引`)
      await fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.error || '链上同步失败')
    } finally {
      setSyncing(false)
    }
  }
  
  const statCards = [
    { 
      label: '已登记资产', 
      value: stats?.totalAssets ?? assets.length, 
      icon: Blocks, 
      color: 'from-blue-500 to-cyan-500',
      bgGlow: 'shadow-blue-500/10',
      link: '/query'
    },
    { 
      label: '有效资产', 
      value: stats?.activeAssets ?? assets.filter(a => a.status === 0).length, 
      icon: FileCheck, 
      color: 'from-green-500 to-emerald-500',
      bgGlow: 'shadow-green-500/10',
      link: '/query'
    },
    { 
      label: '已撤销', 
      value: stats?.revokedAssets ?? 0, 
      icon: Shield, 
      color: 'from-red-500 to-pink-500',
      bgGlow: 'shadow-red-500/10',
      link: '/query'
    },
    { 
      label: '链上交易', 
      value: stats?.totalTransactions ?? 0, 
      icon: Activity, 
      color: 'from-purple-500 to-pink-500',
      bgGlow: 'shadow-purple-500/10',
      link: '/query'
    },
    { 
      label: '校验总数', 
      value: stats?.totalVerifications ?? 0, 
      icon: CheckCircle2, 
      color: 'from-teal-500 to-cyan-500',
      bgGlow: 'shadow-teal-500/10',
      link: '/verify'
    },
    { 
      label: '校验通过', 
      value: stats?.passedVerifications ?? 0, 
      icon: Shield, 
      color: 'from-emerald-500 to-green-500',
      bgGlow: 'shadow-emerald-500/10',
      link: '/verify'
    },
  ]

  const layers = [
    { 
      layer: 'Layer 1', 
      title: '文件内容指纹层', 
      desc: 'SHA-256 对文件内容计算唯一哈希，任何 1 bit 修改都会导致哈希完全不同', 
      icon: Fingerprint,
      field: 'fileHash',
      example: '0x7f83b165…',
      color: 'from-blue-500 to-cyan-500',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
    },
    { 
      layer: 'Layer 2', 
      title: '资产元数据声明层', 
      desc: '标准化 JSON 元数据（名称/类别/权利类型等）的规范化哈希，防止声明被篡改', 
      icon: FileText,
      field: 'metadataHash',
      example: '0xa3c1e9d2…',
      color: 'from-purple-500 to-pink-500',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-400',
    },
    { 
      layer: 'Layer 3', 
      title: '链上权属记录层', 
      desc: 'assetId / creator / owner / status 等权属信息不可篡改地写入智能合约', 
      icon: Lock,
      field: 'onChain',
      example: 'Smart Contract',
      color: 'from-orange-500 to-red-500',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500/15',
      iconColor: 'text-orange-400',
    },
  ]
  
  return (
    <div className="space-y-8">
      <motion.section
        className="hero-surface relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 shadow-2xl sm:p-8 lg:p-10"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-blockchain-accent/10" />
        <div className="pointer-events-none absolute -right-2 -top-4 h-44 w-44 rounded-full border border-purple-400/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-center">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Three-layer trusted evidence
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              让每一份数字资产
              <span className="gradient-text"> 可验证、可流转、可追溯</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
              通过文件指纹、元数据声明和链上权属记录，构建完整的数字资产技术证据链。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary inline-flex items-center gap-2">
                <Zap className="h-4 w-4" />
                开始确权演示
              </Link>
              <Link to="/architecture" className="btn-secondary inline-flex items-center gap-2">
                <Network className="h-4 w-4" />
                查看系统架构
              </Link>
              <motion.button
                className="inline-flex items-center gap-2 px-3 text-sm text-gray-500 hover:text-white"
                onClick={fetchAll}
                whileTap={{ scale: 0.96 }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </motion.button>
              <motion.button
                className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/[0.07] px-4 py-2 text-sm text-green-400 hover:bg-green-500/[0.12] disabled:opacity-50"
                onClick={handleSync}
                disabled={syncing}
                whileTap={{ scale: 0.96 }}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                链上同步
              </motion.button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5 backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Network status</p>
                <p className="mt-1 font-semibold">可信网络运行状态</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                chainInfo?.connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                <span className={`h-2 w-2 rounded-full ${chainInfo?.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {chainInfo?.connected ? '运行正常' : '连接异常'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '网络', value: chainInfo?.network || '--' },
                { label: 'Chain ID', value: chainInfo?.chainId ?? '--' },
                { label: '区块高度', value: chainInfo?.blockNumber != null ? `#${chainInfo.blockNumber}` : '--' },
                { label: '链下索引', value: `${stats?.totalAssets ?? 0} 条` },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.035] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-600">{item.label}</p>
                  <p className="mt-1 font-mono text-sm text-gray-200">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.035] p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-600">Contract address</p>
              <p className="mt-1 truncate font-mono text-xs text-blockchain-accent">
                {chainInfo?.contractAddress || '等待连接'}
              </p>
            </div>
          </div>
        </div>
      </motion.section>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.link}>
              <div className={`card group cursor-pointer p-4 shadow-lg transition-transform hover:-translate-y-1 ${stat.bgGlow}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[11px]">{stat.label}</p>
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={stat.value} />
                    </p>
                  </div>
                  <ArrowUpRight className="ml-auto h-4 w-4 text-gray-700 transition-colors group-hover:text-gray-400" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {stats && (
        <motion.div
          className="grid gap-5 lg:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <MiniBarChart title="资产类别分布" data={stats.categoryDistribution || []} emptyLabel="暂无类别数据" color="from-blue-500 to-cyan-400" />
          <MiniBarChart title="交易类型分布" data={stats.transactionDistribution || []} emptyLabel="暂无交易数据" color="from-purple-500 to-pink-400" />
          <MiniLineChart title="近 14 日登记趋势" data={stats.dailyRegistrations || []} />
        </motion.div>
      )}
      
      {/* Quick Actions */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '登记资产', path: '/register', icon: FileCheck, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-400/50 hover:bg-blue-500/15' },
            { label: '查询资产', path: '/query', icon: Blocks, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/15' },
            { label: '校验资产', path: '/verify', icon: Shield, color: 'bg-green-500/10 text-green-400 border-green-500/20 hover:border-green-400/50 hover:bg-green-500/15' },
            { label: '转移权属', path: '/transfer', icon: ArrowRightLeft, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-400/50 hover:bg-orange-500/15' },
          ].map((action) => (
            <Link key={action.path} to={action.path}>
              <motion.div
                className={`p-4 rounded-xl border ${action.color} flex items-center gap-3 transition-all`}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <action.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{action.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Three-Layer Model Visualization */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">三层结构化确权模型</h2>
            <p className="text-xs text-gray-500 mt-1">数据从文件到链上的分层确权过程</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Database className="w-3.5 h-3.5" />
            <span>On-chain Architecture</span>
          </div>
        </div>

        <div className="relative">
          {/* Connecting arrows between layers */}
          <div className="hidden md:block absolute top-1/2 left-[calc(33.33%-12px)] w-6 -translate-y-1/2 z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M4 12H20M20 12L14 6M20 12L14 18"
                  stroke="#7aa2f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                />
              </svg>
            </motion.div>
          </div>
          <div className="hidden md:block absolute top-1/2 left-[calc(66.66%-12px)] w-6 -translate-y-1/2 z-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M4 12H20M20 12L14 6M20 12L14 18"
                  stroke="#7aa2f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                />
              </svg>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {layers.map((item, index) => (
              <motion.div
                key={item.layer}
                className={`relative p-5 rounded-xl bg-blockchain-dark/60 border ${item.borderColor} overflow-hidden group`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.15, type: 'spring', stiffness: 200 }}
                whileHover={{ y: -6, scale: 1.02 }}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.color}`} />
                
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                      <item.icon className={`w-[18px] h-[18px] ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{item.layer}</p>
                      <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <Hash className="w-3 h-3 text-gray-600" />
                    <span className="text-blockchain-accent/60">{item.field}</span>
                    <span className="text-gray-600 ml-auto">{item.example}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Data flow hint */}
        <motion.div
          className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span>文件上传</span>
          <ChevronRight className="w-3 h-3" />
          <span>哈希计算</span>
          <ChevronRight className="w-3 h-3" />
          <span>元数据生成</span>
          <ChevronRight className="w-3 h-3" />
          <span>链上登记</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blockchain-accent font-medium">确权完成</span>
        </motion.div>
      </motion.div>
      
      {/* Recent Assets */}
      <motion.div
        className="card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近登记的资产</h2>
          <Link to="/query" className="text-blockchain-accent text-sm hover:underline flex items-center gap-1">
            查看全部 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blockchain-accent" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <p>{error}</p>
            <button onClick={fetchAll} className="mt-2 text-blockchain-accent hover:underline">
              重试
            </button>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Blocks className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无已登记的资产</p>
            <Link to="/register" className="mt-2 text-blockchain-accent hover:underline inline-block">
              立即登记第一个资产
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.slice(0, 5).map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <Link to={`/query/${asset.id}`}>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-blockchain-dark/40 hover:bg-blockchain-dark/70 border border-transparent hover:border-white/5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blockchain-accent/10 flex items-center justify-center">
                        <span className="text-blockchain-accent font-bold text-sm">#{asset.id}</span>
                      </div>
                      <div>
                        <p className="font-mono text-sm">{truncateHash(asset.fileHash, 10, 8)}</p>
                        <p className="text-xs text-gray-500">{asset.rightsType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={asset.status === 0 ? 'badge-active' : 'badge-revoked'}>
                        {asset.statusLabel}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Logs */}
      {stats?.recentLogs && stats.recentLogs.length > 0 && (
        <motion.div
          className="card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-lg font-semibold">最近操作记录</h2>
          </div>
          <div className="space-y-2">
            {stats.recentLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-blockchain-dark/30 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.level === 'error' ? 'bg-red-400' : log.level === 'warn' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <span className="text-xs text-gray-500 font-mono w-20 flex-shrink-0">{log.action}</span>
                <span className="text-gray-300 flex-1 truncate">{log.message}</span>
                <span className="text-[10px] text-gray-600 flex-shrink-0">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function MiniBarChart({
  title,
  data,
  emptyLabel,
  color,
}: {
  title: string
  data: { name: string; value: number }[]
  emptyLabel: string
  color: string
}) {
  const max = Math.max(1, ...data.map(item => item.value))
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-gray-600">{data.reduce((sum, item) => sum + item.value, 0)} total</span>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-600">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 5).map(item => (
            <div key={item.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-400">{item.name}</span>
                <span className="font-mono text-gray-500">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniLineChart({
  title,
  data,
}: {
  title: string
  data: { date: string; value: number }[]
}) {
  const max = Math.max(1, ...data.map(item => item.value))
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-gray-600">{data.length} days</span>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-600">暂无趋势数据</p>
      ) : (
        <div className="flex h-28 items-end gap-2">
          {data.map(item => (
            <div key={item.date} className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                className="w-full rounded-t-lg bg-gradient-to-t from-green-500 to-cyan-400"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(12, (item.value / max) * 96)}px` }}
              />
              <span className="text-[9px] text-gray-600">{item.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
