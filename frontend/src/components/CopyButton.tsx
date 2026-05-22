import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyToClipboard } from '../lib/utils'
import toast from 'react-hot-toast'

interface CopyButtonProps {
  text: string
  label?: string
  className?: string
}

export default function CopyButton({ text, label = '已复制', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await copyToClipboard(text)
    setCopied(true)
    toast.success(label, { duration: 1500, style: { background: '#24283b', color: '#e2e8f0', border: '1px solid rgba(122,162,247,0.2)' } })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/10 transition-colors ${className}`}
      title="复制"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
      )}
    </button>
  )
}
