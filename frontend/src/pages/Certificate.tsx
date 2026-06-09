import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { Download, FileCheck, ShieldCheck, ChevronLeft } from 'lucide-react'

import { getAsset, Asset } from '../lib/api'
import CopyButton from '../components/CopyButton'
import { ErrorPanel, LoadingPanel, PageHeader } from '../components/PageUI'

export default function Certificate() {
  const { id } = useParams()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [qr, setQr] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getAsset(Number(id))
      .then(res => {
        if (res.data.success) setAsset(res.data.data)
      })
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false))
  }, [id])

  const certificatePayload = useMemo(() => {
    if (!asset) return ''
    return JSON.stringify({
      certificate: 'Digital Asset Registration Certificate',
      assetId: asset.id,
      assetName: asset.metadata?.assetName || `Asset #${asset.id}`,
      fileHash: asset.fileHash,
      metadataHash: asset.metadataHash,
      creator: asset.creator,
      owner: asset.owner,
      status: asset.statusLabel,
      registeredAt: asset.registeredAtFormatted,
    }, null, 2)
  }, [asset])

  const certificateUrl = useMemo(() => {
    if (!asset || typeof window === 'undefined') return ''
    return `${window.location.origin}/certificate/${asset.id}`
  }, [asset])

  useEffect(() => {
    if (!certificateUrl) return
    QRCode.toDataURL(certificateUrl, { errorCorrectionLevel: 'M', margin: 2, width: 240 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [certificateUrl])

  const downloadCertificate = () => {
    const blob = new Blob([certificatePayload], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asset-certificate-${asset?.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Digital certificate"
        title="数字资产登记凭证"
        description="将资产 ID、双哈希、权属地址和登记时间汇总成可下载凭证，适合答辩展示和截图留档。"
        action={<Link to={`/query/${id}`} className="btn-secondary inline-flex items-center gap-2"><ChevronLeft className="h-4 w-4" />返回详情</Link>}
      />

      {loading && <LoadingPanel label="正在生成登记凭证..." />}
      {error && <ErrorPanel message={error} />}

      {asset && (
        <div className="card overflow-hidden">
          <div className="hero-surface border-b border-white/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15">
              <ShieldCheck className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-blockchain-accent">Certificate of Digital Asset Registration</p>
            <h2 className="mt-3 text-3xl font-bold text-white">{asset.metadata?.assetName || `资产 #${asset.id}`}</h2>
            <p className="mt-2 text-sm text-gray-400">资产编号 #{asset.id} · {asset.statusLabel}</p>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              {[
                { label: '文件指纹 fileHash', value: asset.fileHash },
                { label: '声明指纹 metadataHash', value: asset.metadataHash },
                { label: '创建者 creator', value: asset.creator },
                { label: '当前所有者 owner', value: asset.owner },
                { label: '登记时间', value: asset.registeredAtFormatted || String(asset.registeredAt) },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-white/5 bg-blockchain-dark/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <CopyButton text={item.value} label="已复制" />
                  </div>
                  <p className="break-all font-mono text-sm text-gray-200">{item.value}</p>
                </div>
              ))}
            </div>

            <aside className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blockchain-accent/10">
                <FileCheck className="h-6 w-6 text-blockchain-accent" />
              </div>
              <p className="mt-3 text-sm font-medium">凭证二维码</p>
              <p className="mt-1 text-xs text-gray-500">扫码打开当前登记证书页</p>
              {qr && <img src={qr} alt="certificate qr" className="mx-auto mt-5 rounded-xl bg-white p-2" />}
              {certificateUrl && (
                <p className="mt-3 break-all font-mono text-[11px] leading-5 text-gray-500">{certificateUrl}</p>
              )}
              <button className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2" onClick={downloadCertificate}>
                <Download className="h-4 w-4" />
                下载 JSON 凭证
              </button>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
