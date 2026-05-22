import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Loader2, AlertCircle, FileText, User, Clock, Shield, ArrowRight, History, XCircle, ChevronRight } from 'lucide-react'
import { getAsset, getAssets, revokeAsset, Asset } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { truncateHash, formatFileSize } from '../lib/utils'
import toast from 'react-hot-toast'

export default function Query() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchId, setSearchId] = useState(id || '')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')

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
      const res = await revokeAsset(asset.id)
      if (res.data.success) {
        toast.success('资产已成功撤销')
        fetchAsset(asset.id)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || '撤销失败')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">资产查询</h1>
        <p className="text-gray-400 mt-1">查询链上确权记录详情</p>
      </div>

      {/* Search Bar */}
      <div className="card p-5">
        <div className="flex gap-3">
          <input
            type="number"
            className="input flex-1"
            placeholder="输入资产 ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn-primary flex items-center gap-2" onClick={handleSearch}>
            <Search className="w-4 h-4" />
            查询
          </button>
          {id && (
            <button className="btn-secondary" onClick={() => { navigate('/query'); setAsset(null); setSearchId(''); }}>
              返回列表
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blockchain-accent" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Asset Detail View */}
      {asset && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blockchain-accent/15 flex items-center justify-center">
                <span className="text-xl font-bold text-blockchain-accent">#{asset.id}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{asset.metadata?.assetName || `资产 #${asset.id}`}</h2>
                <span className={asset.status === 0 ? 'badge-active' : 'badge-revoked'}>{asset.statusLabel}</span>
              </div>
            </div>
            <Link to={`/history/${asset.id}`} className="btn-secondary flex items-center gap-2 text-sm">
              <History className="w-4 h-4" /> 历史记录
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">文件哈希 (fileHash)</p>
                  <CopyButton text={asset.fileHash} label="文件哈希已复制" />
                </div>
                <p className="font-mono text-sm break-all text-blockchain-accent/80">{asset.fileHash}</p>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">元数据哈希 (metadataHash)</p>
                  <CopyButton text={asset.metadataHash} label="元数据哈希已复制" />
                </div>
                <p className="font-mono text-sm break-all text-purple-400/80">{asset.metadataHash}</p>
              </div>
              <div className="p-4 bg-blockchain-dark/50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">权利类型</p>
                <p className="font-medium">{asset.rightsTypeLabel || asset.rightsType}</p>
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
            <div className="mt-5 p-4 bg-blockchain-dark/50 rounded-xl">
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

          <div className="flex gap-3 mt-6">
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
                  onClick={handleRevoke}
                  disabled={revoking}
                >
                  {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  撤销资产
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Asset List View */}
      {!id && !loading && assets.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
          <h3 className="font-semibold mb-4">所有资产 ({assets.length})</h3>
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
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无已登记的资产</p>
          <Link to="/register" className="text-blockchain-accent hover:underline">立即登记</Link>
        </div>
      )}
    </div>
  )
}
