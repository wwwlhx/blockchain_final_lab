import { motion } from 'framer-motion'

export function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-white/5 rounded" />
          <div className="h-6 w-12 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blockchain-dark/40 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 bg-white/5 rounded" />
        <div className="h-2 w-20 bg-white/5 rounded" />
      </div>
      <div className="h-5 w-16 bg-white/5 rounded-full" />
    </div>
  )
}

export function SkeletonPage() {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="card p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </motion.div>
  )
}
