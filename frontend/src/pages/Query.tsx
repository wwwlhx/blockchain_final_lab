import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Loader2, User, Clock, Shield, ArrowRight, History, XCircle, ChevronRight, Fingerprint, Database, CheckCircle2, FileCheck } from 'lucide-react'
import { getAsset, getAssets, revokeAsset, confirmWalletAction, getTransactionDetails, Asset, TransactionDetails } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { truncateHash, formatFileSize } from '../lib/utils'
import toast from 'react-hot-toast'
import { EmptyPanel, ErrorPanel, LoadingPanel, PageHeader, SectionTitle } from '../components/PageUI'
import TransactionPanel from '../components/TransactionPanel'
import { useWallet } from '../contexts/WalletContext'

export default function Query() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wallet = useWallet()
  const [searchId, setSearchId] = useState(id || '')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [error, setError] = useState('')
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)

  useEffect(() => {
    if (id) {
      fetchAsset(parseInt(id))
    } else {
      fetchAllAssets()
    }
  }, [id])

  const fetchAsset = async (assetId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await getAsset(assetId)
      if (res.data.success) {
        setAsset(res.data.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '资产不存在')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllAssets = async () => {
    setLoading(true)
    try {
      const res = await getAssets()
      if (res.data.success) {
        setAssets(res.data.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchId) {
      navigate(`/query/${searchId}`)
    }
  }

  const handleRevoke = async () => {
    if (!asset) return
    setRevoking(true)
    try {
      if (wallet.connected && wallet.isCorrectNetwork && wallet.contract) {
        toast.loading('请在 MetaMask 中确认撤销交易', { id: 'wallet-revoke' })
        const tx = await wallet.contract.revokeAsset(BigInt(asset.id))
        toast.loading('正在等待区块确认', { id: 'wallet-revoke' })
        await tx.wait()
        const confirmed = await confirmWalletAction({
          transactionHash: tx.hash,
          expectedType: 'REVOKED',
        })
        setTransaction(confirmed.data.data)
        toast.success('钱包签名撤销成功', { id: 'wallet-revoke' })
        fetchAsset(asset.id)
        return
      }
      const res = await revokeAsset(asset.id)
      if (res.data.success) {
        const details = await getTransactionDetails(res.data.data.transactionHash)
        setTransaction(details.data.data)
        toast.success('资产已成功撤销')
        fetchAsset(asset.id)
      }
    } catch (err: any) {
      toast.dismiss('wallet-revoke')
      toast.error(err.response?.data?.error || '撤销失败')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Asset explorer"
        title="资产可信查询"
        description="按资产 ID 查询链上确权记录，并核对文件指纹、声明指纹、当前权属与生命周期状态。"
      />

      {/* Search Bar */}
      <div className="card overflow-hidden p-1">
        <div className="flex flex-col gap-3 rounded-[14px] bg-blockchain-dark/35 p-4 sm:flex-row">
          <div className="flex flex-1 items-center gap-3">
            <Search className="h-5 w-5 text-gray-600" />
          <input
            type="number"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-gray-600"
            placeholder="输入资产 ID，例如 1"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          </div>
          <button className="btn-primary flex items-center justify-center gap-2" onClick={handleSearch}>
            <Search className="w-4 h-4" />
            查询
          </button>
          {id && (
            <button className="btn-secondary" onClick={() => { navigate('/query'); setAsset(null); setSearchId(''); setError(''); }}>
              返回列表
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingPanel label="正在读取链上资产记录..." />}

      {error && <ErrorPanel message={error} />}

      {/* Asset Detail View */}
      {asset && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          <div className="border-b border-white/5 bg-gradient-to-r from-blockchain-accent/[0.08] to-purple-500/[0.04] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-xl font-bold text-blockchain-accent">#{asset.id}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{asset.metadata?.assetName || `资产 #${asset.id}`}</h2>
                <span className={asset.status === 0 ? 'badge-active' : 'badge-revoked'}>{asset.statusLabel}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/history/${asset.id}`} className="btn-secondary flex items-center justify-center gap-2 text-sm">
                <History className="w-4 h-4" /> 历史记录
              </Link>
              <Link to={`/certificate/${asset.id}`} className="btn-primary flex items-center justify-center gap-2 text-sm">
                <FileCheck className="w-4 h-4" /> 登记证书
              </Link>
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 sm:p-8 md:grid-cols-2">
            <div className="space-y-3">
              <div className="p-4 bg-blockchain-dark/50 rounded-xl border border-blue-500/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="flex items-center gap-2 text-xs text-gray-500"><Fingerprint className="h-3.5 w-3.5 text-blue-400" />文件指纹 fileHash</p>
                  <CopyButton text={asset.fileHash} label="文件哈希已复制" />
                </div>
                <p className="font-mono text-sm break-all text-blockchain-accent/80">{asset.fileHash}</p>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl border border-purple-500/10">
                <div className="flex items-center justify-between mb-1">
                  <p className="flex items-center gap-2 text-xs text-gray-500"><Database className="h-3.5 w-3.5 text-purple-400" />声明指纹 metadataHash</p>
                  <CopyButton text={asset.metadataHash} label="元数据哈希已复制" />
                </div>
                <p className="font-mono text-sm break-all text-purple-400/80">{asset.metadataHash}</p>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">权利类型</p>
                <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-green-400" />{asset.rightsTypeLabel || asset.rightsType}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">创建者</p>
                    <p className="font-mono text-sm truncate">{asset.creator}</p>
                  </div>
                  <CopyButton text={asset.creator} label="地址已复制" />
                </div>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-blockchain-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">当前所有者</p>
                    <p className="font-mono text-sm truncate">{asset.owner}</p>
                  </div>
                  <CopyButton text={asset.owner} label="地址已复制" />
                </div>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">登记时间</p>
                  <p className="text-sm">{asset.registeredAtFormatted}</p>
                </div>
              </div>
            </div>
          </div>

          {asset.metadata && (
            <div className="mx-6 mb-6 p-5 bg-blockchain-dark/50 rounded-xl border border-white/5 sm:mx-8 sm:mb-8">
              <p className="text-sm font-medium mb-3">元数据详情</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500 text-xs block">资产类别</span> {asset.metadata.assetCategory}</div>
                <div><span className="text-gray-500 text-xs block">原始文件</span> {asset.metadata.originalFileName}</div>
                <div><span className="text-gray-500 text-xs block">文件大小</span> {formatFileSize(asset.metadata.fileSize)}</div>
                <div><span className="text-gray-500 text-xs block">标准版本</span> {asset.metadata.metadataVersion}</div>
              </div>
              {asset.metadata.description && (
                <p className="mt-3 text-sm text-gray-400">{asset.metadata.description}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/5 bg-black/10 p-6 sm:px-8">
            <Link to={`/verify/${asset.id}`} className="btn-primary flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4" /> 校验资产
            </Link>
            {asset.status === 0 && (
              <>
                <Link to={`/transfer/${asset.id}`} className="btn-secondary flex items-center gap-2 text-sm">
                  <ArrowRight className="w-4 h-4" /> 转移权属
                </Link>
                <button
                  className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 hover:border-red-500/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                  onClick={() => setConfirmRevoke(true)}
                  disabled={revoking}
                >
                  {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  撤销资产
                </button>
              </>
            )}
          </div>

          {confirmRevoke && (
            <div className="border-t border-red-500/15 bg-red-500/[0.05] p-6 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-red-300">确认撤销资产 #{asset.id}？</p>
                  <p className="mt-1 text-xs text-gray-500">撤销会写入链上且不可恢复，撤销后资产不能继续转移。</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm" onClick={() => setConfirmRevoke(false)}>取消</button>
                  <button
                    className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    onClick={async () => { await handleRevoke(); setConfirmRevoke(false) }}
                    disabled={revoking}
                  >
                    {revoking ? '正在撤销...' : '确认写入链上'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {transaction && (
            <div className="border-t border-white/5 p-6 sm:px-8">
              <TransactionPanel transaction={transaction} title="资产撤销交易已确认" />
            </div>
          )}
        </motion.div>
      )}

      {/* Asset List View */}
      {!id && !loading && assets.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
          <SectionTitle title="资产目录" description="链上登记事件生成的可信资产列表" aside={<span className="badge-active">{assets.length} records</span>} />
          <div className="space-y-2">
            {assets.map((a, index) => (
              <Link key={a.id} to={`/query/${a.id}`}>
                <motion.div
                  className="flex items-center justify-between p-3.5 rounded-xl bg-blockchain-dark/40 hover:bg-blockchain-dark/70 border border-transparent hover:border-white/5 transition-all group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ x: 3 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blockchain-accent/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-blockchain-accent">#{a.id}</span>
                    </div>
                    <div>
                      <p className="font-mono text-sm">{truncateHash(a.fileHash, 10, 8)}</p>
                      <p className="text-xs text-gray-500">{a.rightsType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={a.status === 0 ? 'badge-active' : 'badge-revoked'}>{a.statusLabel}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {!id && !loading && assets.length === 0 && !error && (
        <EmptyPanel
          title="还没有可信资产记录"
          description="完成首次资产登记后，文件指纹、声明指纹和链上权属信息会显示在这里。"
          action={<Link to="/register" className="btn-primary inline-flex">登记第一个资产</Link>}
        />
      )}
    </div>
  )
}
