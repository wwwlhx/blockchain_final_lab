import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function LoadingPanel({ label = '正在加载可信数据...' }: { label?: string }) {
  return (
    <div className="card flex min-h-48 flex-col items-center justify-center gap-3 p-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-blockchain-accent/20 blur-lg" />
        <Loader2 className="relative h-8 w-8 animate-spin text-blockchain-accent" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-4 text-red-300"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">请求未完成</p>
        <p className="mt-1 text-xs text-red-300/70">{message}</p>
      </div>
    </motion.div>
  )
}

export function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.035]">
        <Inbox className="h-6 w-6 text-gray-600" />
      </div>
      <h3 className="font-semibold text-gray-200">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function SectionTitle({
  title,
  description,
  aside,
}: {
  title: string
  description?: string
  aside?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>
      {aside}
    </div>
  )
}
