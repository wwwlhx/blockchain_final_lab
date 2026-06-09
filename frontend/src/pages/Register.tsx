import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, FileCheck, Hash, Database, CheckCircle2, 
  Loader2, AlertCircle, ArrowRight, Sparkles
} from 'lucide-react'
import {
  uploadFile,
  registerAsset,
  prepareWalletRegistration,
  confirmWalletRegistration,
  getTransactionDetails,
} from '../lib/api'
import CopyButton from '../components/CopyButton'
import { PageHeader } from '../components/PageUI'
import TransactionPanel from '../components/TransactionPanel'
import { useWallet } from '../contexts/WalletContext'
import toast from 'react-hot-toast'

type Step = 'upload' | 'metadata' | 'confirm' | 'processing' | 'success'

interface FileInfo {
  file: File
  filePath: string
  fileName: string
  fileHash: string
  fileSize: number
  extension: string
  suggestedCategory: string
}

export default function Register() {
  const navigate = useNavigate()
  const wallet = useWallet()
  const [step, setStep] = useState<Step>('upload')
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [formData, setFormData] = useState({
    assetName: '',
    description: '',
    rightsType: 'original',
    assetCategory: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const res = await uploadFile(file)
      if (res.data.success) {
        setFileInfo({
          file,
          ...res.data.data,
        })
        setFormData(prev => ({
          ...prev,
          assetName: file.name.replace(/\.[^/.]+$/, ''),
          assetCategory: res.data.data.suggestedCategory,
        }))
        setStep('metadata')
        toast.success('文件哈希计算完成')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '上传失败')
      toast.error('文件上传失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!fileInfo) return
    setStep('processing')
    setError('')
    
    try {
      if (wallet.connected && wallet.isCorrectNetwork && wallet.contract && wallet.address) {
        const preparedRes = await prepareWalletRegistration({
          filePath: fileInfo.filePath,
          assetName: formData.assetName,
          description: formData.description,
          rightsType: formData.rightsType,
          assetCategory: formData.assetCategory,
          claimantAddress: wallet.address,
        })
        const prepared = preparedRes.data.data
        toast.loading('请在 MetaMask 中确认登记交易', { id: 'wallet-register' })
        const tx = await wallet.contract.registerAsset(
          prepared.fileHash,
          prepared.metadataHash,
          prepared.metadataURI,
          prepared.rightsType,
        )
        toast.loading('交易已提交，正在等待区块确认', { id: 'wallet-register' })
        await tx.wait()
        const confirmed = await confirmWalletRegistration({
          transactionHash: tx.hash,
          assetName: formData.assetName,
          description: formData.description,
          assetCategory: formData.assetCategory,
        })
        const details = await getTransactionDetails(tx.hash)
        setResult({ ...confirmed.data.data, transactionDetails: details.data.data, signingMode: 'wallet' })
        setStep('success')
        toast.success('钱包签名登记成功', { id: 'wallet-register' })
        return
      }

      const res = await registerAsset({
        filePath: fileInfo.filePath,
        assetName: formData.assetName,
        description: formData.description,
        rightsType: formData.rightsType,
        assetCategory: formData.assetCategory,
      })
      
      if (res.data.success) {
        const details = await getTransactionDetails(res.data.data.transactionHash)
        setResult({ ...res.data.data, transactionDetails: details.data.data, signingMode: 'managed' })
        setStep('success')
        toast.success('资产已成功登记到区块链！')
      } else {
        setError(res.data.error || '登记失败')
        setStep('confirm')
        toast.error(res.data.error || '登记失败')
      }
    } catch (err: any) {
      toast.dismiss('wallet-register')
      setError(err.response?.data?.error || err.message || '登记失败')
      setStep('confirm')
      toast.error(err.response?.data?.error || '登记失败')
    }
  }

  const rightsTypes = [
    { value: 'original', label: '原创确权', desc: '这是我的原创作品' },
    { value: 'licensed', label: '授权使用', desc: '我被授权使用此作品' },
    { value: 'assigned', label: '权利受让', desc: '权利已转让给我' },
    { value: 'joint', label: '共同权属', desc: '多人共同拥有权利' },
  ]

  const categories = [
    'document', 'image', 'audio', 'video', 'code', 'dataset', 'model', 'other'
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <PageHeader
          eyebrow="Asset registration"
          title="创建可信资产凭证"
          description="上传文件、完善权利声明，并将文件指纹与声明指纹写入智能合约。"
        />
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {['上传文件', '填写信息', '确认登记', '完成'].map((label, index) => {
          const stepIndex = ['upload', 'metadata', 'confirm', 'success'].indexOf(step)
          const isActive = index <= stepIndex
          const isCurrent = index === stepIndex
          
          return (
            <div key={label} className="relative flex flex-col items-center text-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  isActive 
                    ? 'bg-blockchain-accent text-white' 
                    : 'bg-blockchain-card text-gray-500'
                } ${isCurrent ? 'ring-2 ring-blockchain-accent ring-offset-2 ring-offset-blockchain-dark' : ''}`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {index + 1}
              </motion.div>
              <span className={`mt-2 text-xs sm:text-sm ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {label}
              </span>
              {index < 3 && (
                <div className={`absolute left-[calc(50%+24px)] top-5 h-0.5 w-[calc(100%-48px)] ${isActive ? 'bg-blockchain-accent' : 'bg-blockchain-card'}`} />
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-8"
          >
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                dragActive 
                  ? 'border-blockchain-accent bg-blockchain-accent/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-16 h-16 text-blockchain-accent animate-spin mb-4" />
                  <p className="text-lg">正在计算文件哈希...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-lg mb-2">拖拽文件到此处，或</p>
                  <label className="btn-primary inline-block cursor-pointer">
                    选择文件
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-4">
                    支持任意类型文件，系统将自动计算 SHA-256 哈希
                  </p>
                </>
              )}
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Metadata */}
        {step === 'metadata' && fileInfo && (
          <motion.div
            key="metadata"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-8"
          >
            {/* File Info Display */}
            <div className="mb-6 p-4 bg-blockchain-dark/50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blockchain-accent/20 flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-blockchain-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{fileInfo.fileName}</p>
                  <p className="text-sm text-gray-500">
                    {(fileInfo.fileSize / 1024).toFixed(2)} KB · {fileInfo.extension}
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blockchain-dark rounded-lg">
                <p className="text-xs text-gray-500 mb-1">文件哈希 (SHA-256)</p>
                <p className="font-mono text-sm text-blockchain-accent break-all">{fileInfo.fileHash}</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">资产名称 *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.assetName}
                  onChange={(e) => setFormData(prev => ({ ...prev, assetName: e.target.value }))}
                  placeholder="输入资产名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">资产描述</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述您的数字资产"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">权利类型 *</label>
                <div className="grid grid-cols-2 gap-3">
                  {rightsTypes.map((type) => (
                    <motion.div
                      key={type.value}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.rightsType === type.value
                          ? 'border-blockchain-accent bg-blockchain-accent/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, rightsType: type.value }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">资产类别</label>
                <select
                  className="input"
                  value={formData.assetCategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, assetCategory: e.target.value }))}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                className="btn-secondary"
                onClick={() => {
                  setStep('upload')
                  setFileInfo(null)
                }}
              >
                返回上传
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setStep('confirm')}
                disabled={!formData.assetName}
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && fileInfo && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card p-8"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blockchain-accent" />
              确认登记信息
            </h3>

            <div className={`mb-6 rounded-xl border p-4 ${
              wallet.connected && wallet.isCorrectNetwork
                ? 'border-green-500/20 bg-green-500/[0.05]'
                : 'border-yellow-500/20 bg-yellow-500/[0.05]'
            }`}>
              <p className={`text-sm font-medium ${wallet.connected && wallet.isCorrectNetwork ? 'text-green-400' : 'text-yellow-400'}`}>
                {wallet.connected && wallet.isCorrectNetwork ? 'MetaMask 用户签名模式' : '后端测试账户托管模式'}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {wallet.connected && wallet.isCorrectNetwork
                  ? `本次交易将由当前钱包 ${wallet.address} 直接签署。`
                  : '连接 MetaMask 并切换至 Hardhat 网络后，可由用户钱包直接签署交易。'}
              </p>
            </div>

            <div className="space-y-4">
              {[
                { label: '文件名称', value: fileInfo.fileName },
                { label: '文件大小', value: `${(fileInfo.fileSize / 1024).toFixed(2)} KB` },
                { label: '文件哈希', value: fileInfo.fileHash, mono: true },
                { label: '资产名称', value: formData.assetName },
                { label: '资产描述', value: formData.description || '(未填写)' },
                { label: '权利类型', value: rightsTypes.find(t => t.value === formData.rightsType)?.label },
                { label: '资产类别', value: formData.assetCategory },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={`text-right max-w-[60%] ${item.mono ? 'font-mono text-sm break-all' : ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button className="btn-secondary" onClick={() => setStep('metadata')}>
                返回修改
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={handleRegister}>
                <Database className="w-4 h-4" />
                确认登记到区块链
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center"
          >
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-blockchain-accent/20 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Hash className="w-12 h-12 text-blockchain-accent" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2">正在写入区块链</h3>
            <p className="text-gray-400">请稍候，交易正在处理中...</p>
            
            <div className="mt-8 space-y-3">
              {['计算元数据哈希', '生成链上交易', '等待区块确认'].map((text, i) => (
                <motion.div
                  key={text}
                  className="flex items-center justify-center gap-3 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.5 }}
                >
                  <Loader2 className="w-4 h-4 animate-spin text-blockchain-accent" />
                  {text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8"
          >
            <div className="text-center mb-8">
              <motion.div
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <h3 className="text-2xl font-bold gradient-text">登记成功！</h3>
              <p className="text-gray-400 mt-1">您的数字资产已成功写入区块链</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: '资产 ID', value: `#${result.assetId}`, accent: true },
                { label: '确认区块', value: `#${result.blockNumber}` },
                { label: '权利类型', value: result.rightsType },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/5 bg-blockchain-dark/50 p-4 text-center">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`mt-2 font-mono text-lg font-bold ${item.accent ? 'text-blockchain-accent' : 'text-white'}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-white/5 bg-blockchain-dark/50 p-5">
              {[
                { label: '文件指纹 fileHash', value: result.fileHash },
                { label: '声明指纹 metadataHash', value: result.metadataHash },
                { label: '交易凭证 transactionHash', value: result.transactionHash },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-black/20 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">{item.label}</span>
                    <CopyButton text={item.value} label="已复制" />
                  </div>
                  <p className="break-all font-mono text-xs text-blockchain-accent/90">{item.value}</p>
                </div>
              ))}
            </div>

            {result.transactionDetails && (
              <div className="mt-4">
                <TransactionPanel
                  transaction={result.transactionDetails}
                  title={result.signingMode === 'wallet' ? 'MetaMask 签名交易已确认' : '托管账户交易已确认'}
                />
              </div>
            )}

            <div className="grid gap-3 mt-8 sm:grid-cols-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setStep('upload')
                  setFileInfo(null)
                  setResult(null)
                  setFormData({ assetName: '', description: '', rightsType: 'original', assetCategory: '' })
                }}
              >
                继续登记
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => navigate(`/query/${result.assetId}`)}
              >
                查看资产详情
              </button>
              <button
                className="btn-secondary flex-1"
                onClick={() => navigate(`/certificate/${result.assetId}`)}
              >
                查看登记证书
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
