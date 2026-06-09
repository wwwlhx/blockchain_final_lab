import { motion } from 'framer-motion'
import { CheckCircle2, Fuel, Hash, Layers, User } from 'lucide-react'

import { TransactionDetails } from '../lib/api'
import CopyButton from './CopyButton'
import { truncateAddress } from '../lib/utils'

export default function TransactionPanel({
  transaction,
  title = '交易已确认',
}: {
  transaction: TransactionDetails
  title?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/[0.04]"
    >
      <div className="flex items-center gap-3 border-b border-green-500/10 bg-green-500/[0.05] p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-green-300">{title}</p>
          <p className="text-xs text-gray-500">{transaction.timestampFormatted || '区块时间读取中'}</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {[
          { label: '确认区块', value: `#${transaction.blockNumber}`, icon: Layers },
          { label: 'Gas Used', value: transaction.gasUsed, icon: Fuel },
          { label: '发起账户', value: truncateAddress(transaction.from), icon: User },
          { label: '交易费用', value: transaction.fee ? `${Number(transaction.fee).toFixed(8)} ETH` : '--', icon: Fuel },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/5 bg-black/15 p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-600">
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </div>
            <p className="mt-2 font-mono text-sm text-gray-200">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mx-5 mb-5 rounded-xl border border-white/5 bg-black/15 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-600">
            <Hash className="h-3.5 w-3.5" /> Transaction hash
          </span>
          <CopyButton text={transaction.transactionHash} label="交易哈希已复制" />
        </div>
        <p className="mt-2 break-all font-mono text-xs text-blockchain-accent">{transaction.transactionHash}</p>
      </div>
    </motion.div>
  )
}
