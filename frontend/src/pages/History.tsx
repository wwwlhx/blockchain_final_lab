import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, FileCheck, ArrowRight, XCircle, Loader2, AlertCircle, ChevronLeft } from 'lucide-react'
import { getAssetHistory, HistoryEvent } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { truncateAddress } from '../lib/utils'

export default function History() {
  const { id } = useParams()
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      setLoading(true)
      getAssetHistory(parseInt(id))
        .then(res => {
          if (res.data.success) setHistory(res.data.data.history)
        })
        .catch(err => setError(err.response?.data?.error || err.message))
        .finally(() => setLoading(false))
    }
  }, [id])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'REGISTERED': return <FileCheck className="w-4 h-4" />
      case 'TRANSFERRED': return <ArrowRight className="w-4 h-4" />
      case 'REVOKED': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'REGISTERED': return 'bg-green-500 shadow-green-500/30'
      case 'TRANSFERRED': return 'bg-blue-500 shadow-blue-500/30'
      case 'REVOKED': return 'bg-red-500 shadow-red-500/30'
      default: return 'bg-gray-500'
    }
  }

  const getEventBorder = (type: string) => {
    switch (type) {
      case 'REGISTERED': return 'border-green-500/20 hover:border-green-500/40'
      case 'TRANSFERRED': return 'border-blue-500/20 hover:border-blue-500/40'
      case 'REVOKED': return 'border-red-500/20 hover:border-red-500/40'
      default: return 'border-white/5'
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'REGISTERED': return '资产登记'
      case 'TRANSFERRED': return '权属转移'
      case 'REVOKED': return '资产撤销'
      default: return type
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">资产历史</h1>
          <p className="text-gray-400 mt-1">资产 #{id} 的生命周期记录</p>
        </div>
        <Link to={`/query/${id}`} className="btn-secondary flex items-center gap-2 text-sm">
          <ChevronLeft className="w-4 h-4" /> 返回详情
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blockchain-accent" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无历史记录</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="card p-8">
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>共 {history.length} 条事件记录</span>
          </div>
          <div className="relative">
            <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gradient-to-b from-blockchain-accent via-purple-500 to-transparent" />

            <div className="space-y-6">
              {history.map((event, index) => (
                <motion.div
                  key={`${event.type}-${event.blockNumber}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-11"
                >
                  <div className={`absolute left-1.5 top-5 w-[22px] h-[22px] rounded-full ${getEventColor(event.type)} shadow-md flex items-center justify-center text-white z-10`}>
                    {getEventIcon(event.type)}
                  </div>

                  <div className={`p-5 bg-blockchain-dark/50 rounded-xl border ${getEventBorder(event.type)} transition-colors`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{getEventLabel(event.type)}</span>
                      <span className="text-xs text-gray-500 font-mono">Block #{event.blockNumber}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      {event.timestampFormatted}
                    </div>

                    {event.type === 'REGISTERED' && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">创建者</span>
                          <span className="font-mono text-xs flex-1 truncate">{event.data.creator}</span>
                          <CopyButton text={event.data.creator} label="地址已复制" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">权利类型</span>
                          <span className="text-xs">{event.data.rightsType}</span>
                        </div>
                      </div>
                    )}

                    {event.type === 'TRANSFERRED' && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex-1 p-2.5 bg-black/20 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">FROM</p>
                          <p className="font-mono text-xs">{truncateAddress(event.data.from)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blockchain-accent flex-shrink-0" />
                        <div className="flex-1 p-2.5 bg-black/20 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">TO</p>
                          <p className="font-mono text-xs text-blockchain-accent">{truncateAddress(event.data.to)}</p>
                        </div>
                      </div>
                    )}

                    {event.type === 'REVOKED' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 text-xs">操作人</span>
                        <span className="font-mono text-xs flex-1 truncate">{event.data.operator}</span>
                        <CopyButton text={event.data.operator} label="地址已复制" />
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider">TX</span>
                      <span className="font-mono text-[11px] text-blockchain-accent/60 truncate flex-1">{event.transactionHash}</span>
                      <CopyButton text={event.transactionHash} label="交易哈希已复制" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
