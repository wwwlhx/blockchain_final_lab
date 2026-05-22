import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, CheckCircle2, XCircle, Loader2, AlertCircle, Upload, FileCheck } from 'lucide-react'
import { verifyAsset, uploadFile, VerifyResult } from '../lib/api'
import CopyButton from '../components/CopyButton'
import toast from 'react-hot-toast'

export default function Verify() {
  const { id } = useParams()
  const [assetId, setAssetId] = useState(id || '')
  const [filePath, setFilePath] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileHash, setFileHash] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0])
  }, [])

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const res = await uploadFile(file)
      if (res.data.success) {
        setFilePath(res.data.data.filePath)
        setFileName(file.name)
        setFileHash(res.data.data.fileHash)
        toast.success('文件哈希计算完成')
      }
    } catch (err: any) {
      setError(err.message)
      toast.error('文件上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleVerify = async () => {
    if (!assetId || !filePath) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await verifyAsset(parseInt(assetId), filePath)
      if (res.data.success) {
        setResult(res.data.data)
        if (res.data.data.overallResult) toast.success('校验通过！文件未被篡改')
        else toast.error('校验失败！文件或声明已被修改')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message)
      toast.error('校验请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">资产校验</h1>
        <p className="text-gray-400 mt-1">验证文件完整性与链上记录一致性</p>
      </div>

      <div className="card p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">资产 ID</label>
            <input type="number" className="input" placeholder="输入资产 ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">待校验文件</label>
            {fileName ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-blockchain-dark/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-blockchain-accent" />
                    <span className="font-medium text-sm">{fileName}</span>
                  </div>
                  <button className="text-xs text-blockchain-accent hover:underline" onClick={() => { setFileName(''); setFilePath(''); setFileHash(''); }}>更换文件</button>
                </div>
                {fileHash && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blockchain-dark rounded-lg">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">SHA-256</span>
                    <span className="font-mono text-xs text-blockchain-accent/70 break-all flex-1">{fileHash}</span>
                    <CopyButton text={fileHash} label="哈希已复制" />
                  </div>
                )}
              </motion.div>
            ) : (
              <label
                className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive ? 'border-blockchain-accent bg-blockchain-accent/5' : 'border-white/10 hover:border-white/20'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-blockchain-accent animate-spin mb-2" />
                    <p className="text-sm">正在计算文件哈希...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-sm">拖拽或点击选择待校验文件</p>
                    <p className="text-xs text-gray-500 mt-1">上传后将自动计算 SHA-256 哈希</p>
                  </>
                )}
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={handleVerify} disabled={!assetId || !filePath || loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? '校验中...' : '开始校验'}
          </button>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
              <div className={`p-6 rounded-2xl border ${result.overallResult ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-4 mb-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  >
                    {result.overallResult
                      ? <CheckCircle2 className="w-12 h-12 text-green-400" />
                      : <XCircle className="w-12 h-12 text-red-400" />
                    }
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold">{result.overallResult ? '校验通过' : '校验失败'}</h3>
                    <p className="text-sm text-gray-400">{result.overallResult ? '文件和声明均未被篡改' : '文件或声明已被修改，与链上记录不一致'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.div
                    className="p-4 bg-black/20 rounded-xl"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">文件哈希校验</span>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${result.fileHashMatch ? 'text-green-400' : 'text-red-400'}`}>
                        {result.fileHashMatch ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {result.fileHashMatch ? '一致' : '不一致'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-2.5 bg-black/20 rounded-lg">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">链上记录</p>
                        <p className="font-mono text-xs break-all">{result.chainFileHash}</p>
                      </div>
                      <div className="p-2.5 bg-black/20 rounded-lg">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">本地计算</p>
                        <p className={`font-mono text-xs break-all ${result.fileHashMatch ? '' : 'text-red-400'}`}>{result.localFileHash}</p>
                      </div>
                    </div>
                  </motion.div>

                  {result.metadataHashMatch !== null && (
                    <motion.div
                      className="p-4 bg-black/20 rounded-xl"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">元数据哈希校验</span>
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${result.metadataHashMatch ? 'text-green-400' : 'text-red-400'}`}>
                          {result.metadataHashMatch ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {result.metadataHashMatch ? '一致' : '不一致'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-2.5 bg-black/20 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">链上记录</p>
                          <p className="font-mono text-xs break-all">{result.chainMetadataHash}</p>
                        </div>
                        <div className="p-2.5 bg-black/20 rounded-lg">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">本地计算</p>
                          <p className={`font-mono text-xs break-all ${result.metadataHashMatch ? '' : 'text-red-400'}`}>{result.localMetadataHash}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
