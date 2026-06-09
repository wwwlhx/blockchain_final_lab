import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2, User, ArrowRightLeft, ShieldCheck, LockKeyhole } from 'lucide-react'
import { getAsset, transferAsset, getAccounts, confirmWalletAction, getTransactionDetails, Asset, TransactionDetails } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { truncateAddress } from '../lib/utils'
import toast from 'react-hot-toast'
import { ErrorPanel, PageHeader } from '../components/PageUI'
import TransactionPanel from '../components/TransactionPanel'
import { useWallet } from '../contexts/WalletContext'

export default function Transfer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wallet = useWallet()
  const [assetId, setAssetId] = useState(id || '')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [newOwner, setNewOwner] = useState('')
  const [accounts, setAccounts] = useState<{ address: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)

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
      if (wallet.connected && wallet.isCorrectNetwork && wallet.contract) {
        toast.loading('请在 MetaMask 中确认权属转移', { id: 'wallet-transfer' })
        const tx = await wallet.contract.transferAsset(BigInt(assetId), newOwner)
        toast.loading('正在等待区块确认', { id: 'wallet-transfer' })
        await tx.wait()
        const confirmed = await confirmWalletAction({
          transactionHash: tx.hash,
          expectedType: 'TRANSFERRED',
        })
        setTransaction(confirmed.data.data)
        setSuccess(true)
        toast.success('钱包签名转移成功', { id: 'wallet-transfer' })
        setTimeout(() => navigate(`/query/${assetId}`), 4000)
        return
      }
      const res = await transferAsset(parseInt(assetId), newOwner)
      if (res.data.success) {
        const details = await getTransactionDetails(res.data.data.transactionHash)
        setTransaction(details.data.data)
        setSuccess(true)
        toast.success('资产权属转移成功！')
        setTimeout(() => navigate(`/query/${assetId}`), 2500)
      }
    } catch (err: any) {
      toast.dismiss('wallet-transfer')
      const msg = err.response?.data?.error || err.message
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Ownership transfer"
        title="可信权属转移"
        description="智能合约只允许当前 owner 发起转移，并将本次变化永久记录为链上事件。"
      />

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card hero-surface p-12 text-center"
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
            {transaction && <div className="mt-6 text-left"><TransactionPanel transaction={transaction} title="权属转移交易已确认" /></div>}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[1fr_0.72fr]"
          >
            <div className="card space-y-6 p-6 sm:p-8">
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

            {error && <ErrorPanel message={error} />}

            <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleTransfer} disabled={!assetId || !newOwner || loading || asset?.status !== 0}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? '转移中...' : '确认转移'}
            </button>

            {asset?.status === 1 && (
              <p className="text-center text-sm text-red-400">该资产已被撤销，无法转移</p>
            )}
            </div>

            <aside className="card h-fit overflow-hidden">
              <div className="border-b border-white/5 bg-gradient-to-r from-orange-500/[0.09] to-purple-500/[0.04] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-semibold">合约约束</h2>
                <p className="mt-2 text-xs leading-6 text-gray-500">权属变化不是数据库字段修改，而是一次需要满足合约条件的链上状态变更。</p>
              </div>
              <div className="space-y-4 p-6">
                {[
                  '仅当前所有者可以发起转移',
                  '新所有者不能是零地址',
                  '已撤销资产禁止继续流转',
                  '成功后生成不可篡改的转移事件',
                ].map((rule, index) => (
                  <div key={rule} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-xs font-bold text-green-400">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-gray-400">{rule}</p>
                  </div>
                ))}
                <div className="mt-5 rounded-xl border border-green-500/15 bg-green-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                    <ShieldCheck className="h-4 w-4" />
                    权限由合约执行
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-500">即使绕过前端直接调用 API，链上权限检查仍然有效。</p>
                </div>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
