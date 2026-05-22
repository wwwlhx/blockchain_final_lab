import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, AlertCircle, CheckCircle2, User, ArrowRightLeft } from 'lucide-react'
import { getAsset, transferAsset, getAccounts, Asset } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { truncateAddress } from '../lib/utils'
import toast from 'react-hot-toast'

export default function Transfer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assetId, setAssetId] = useState(id || '')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [newOwner, setNewOwner] = useState('')
  const [accounts, setAccounts] = useState<{ address: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAccounts().then(res => res.data.success && setAccounts(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (assetId) {
      getAsset(parseInt(assetId)).then(res => {
        if (res.data.success) setAsset(res.data.data)
      }).catch(() => setAsset(null))
    }
  }, [assetId])

  const handleTransfer = async () => {
    if (!assetId || !newOwner) return
    setLoading(true)
    setError('')
    try {
      const res = await transferAsset(parseInt(assetId), newOwner)
      if (res.data.success) {
        setSuccess(true)
        toast.success('资产权属转移成功！')
        setTimeout(() => navigate(`/query/${assetId}`), 2500)
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">权属转移</h1>
        <p className="text-gray-400 mt-1">将资产所有权转移给新地址</p>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold gradient-text mb-2">转移成功！</h2>
            <p className="text-gray-400">资产权属已变更，正在跳转至详情页...</p>
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-500">
              <span className="font-mono">{truncateAddress(asset?.owner || '')}</span>
              <ArrowRight className="w-4 h-4 text-blockchain-accent" />
              <span className="font-mono text-blockchain-accent">{truncateAddress(newOwner)}</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-2">资产 ID</label>
              <input type="number" className="input" placeholder="输入资产 ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
            </div>

            {asset && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blockchain-accent/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-blockchain-accent">#{asset.id}</span>
                  </div>
                  <span className={asset.status === 0 ? 'badge-active' : 'badge-revoked'}>{asset.statusLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500 text-xs">当前所有者</span>
                  <span className="font-mono text-xs flex-1 truncate">{asset.owner}</span>
                  <CopyButton text={asset.owner} label="地址已复制" />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">新所有者地址</label>
              <input type="text" className="input font-mono text-sm" placeholder="0x..." value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
              {accounts.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">快速选择测试账户:</p>
                  <div className="flex flex-wrap gap-2">
                    {accounts.filter(a => a.address !== asset?.owner).map((acc) => (
                      <motion.button
                        key={acc.address}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                          newOwner === acc.address
                            ? 'bg-blockchain-accent/15 border-blockchain-accent/40 text-blockchain-accent'
                            : 'bg-blockchain-dark border-white/5 text-gray-400 hover:bg-blockchain-accent/10 hover:border-blockchain-accent/20'
                        }`}
                        onClick={() => setNewOwner(acc.address)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {acc.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {newOwner && asset && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-4 p-4 bg-blockchain-dark/30 rounded-xl"
              >
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">From</p>
                  <p className="font-mono text-xs">{truncateAddress(asset.owner)}</p>
                </div>
                <ArrowRightLeft className="w-5 h-5 text-blockchain-accent" />
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">To</p>
                  <p className="font-mono text-xs text-blockchain-accent">{truncateAddress(newOwner)}</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
              </motion.div>
            )}

            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleTransfer} disabled={!assetId || !newOwner || loading || asset?.status !== 0}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? '转移中...' : '确认转移'}
            </button>

            {asset?.status === 1 && (
              <p className="text-center text-sm text-red-400">该资产已被撤销，无法转移</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
