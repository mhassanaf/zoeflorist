'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { submitPaymentProof } from '@/app/actions/orders'
import { useToast } from '@/components/Toast'
import OrderReviewButton from '@/components/OrderReviewButton'
import { generateDynamicQRIS, checkQRISPaymentStatus } from '@/app/actions/payment'

interface Product {
  id: string
  name: string
  image_url: string
  size: string
  color: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  product_id: string
  products: Product | null
}

interface Order {
  id: string
  created_at: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
  total_amount: number
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  payment_method: string
  payment_proof_url: string | null
  payment_status: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected'
  admin_message: string | null
  order_items: OrderItem[]
  shipping_fee?: number
  shipping_courier?: string | null
}

interface OrderCardClientProps {
  order: Order
  userReviews: any[]
}

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Processing: 'bg-blue-100 text-blue-800 border-blue-200',
  Completed: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const paymentStatusColors: Record<string, string> = {
  Unpaid: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  'Waiting Verification': 'bg-sky-100 text-sky-850 border-sky-200',
  Paid: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
}

export default function OrderCardClient({ order, userReviews }: OrderCardClientProps) {
  const { showToast, dismissToast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Copy-to-clipboard state
  const [copiedText, setCopiedText] = useState(false)

  // QRISLY States
  const [qrisString, setQrisString] = useState<string | null>(null)
  const [qrisHistoryId, setQrisHistoryId] = useState<number | null>(null)
  const [qrisFinalAmount, setQrisFinalAmount] = useState<number | null>(null)
  const [qrisExpiryTime, setQrisExpiryTime] = useState<string | null>(null)
  const [qrisLoading, setQrisLoading] = useState(false)
  const [qrisError, setQrisError] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [qrisSuccess, setQrisSuccess] = useState(false)
  const [showManualUpload, setShowManualUpload] = useState(false)
  const [countdown, setCountdown] = useState<string>('15:00')
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [activeGuide, setActiveGuide] = useState<'dana' | 'gopay' | 'ovo' | 'shopeepay' | null>(null)

  // Generate dynamic QRIS upon component mounting
  useEffect(() => {
    if (
      order.payment_method === 'QRIS' &&
      (!order.payment_status || order.payment_status === 'Unpaid' || order.payment_status === 'Rejected')
    ) {
      const getQRIS = async () => {
        setQrisLoading(true)
        setQrisError(null)
        const res = await generateDynamicQRIS(order.id, order.total_amount)
        if (res.success && res.qrisString && res.historyId) {
          setQrisString(res.qrisString)
          setQrisHistoryId(res.historyId)
          setQrisFinalAmount(res.finalAmount || order.total_amount)
          setQrisExpiryTime(res.expiryTime || null)
        } else {
          setQrisError(res.error || 'Gagal menghasilkan QRIS dinamis.')
        }
        setQrisLoading(false)
      }
      getQRIS()
    }
  }, [order.payment_method, order.payment_status, order.id, order.total_amount])

  // Countdown handler
  useEffect(() => {
    if (!qrisExpiryTime) return

    const expDate = new Date(qrisExpiryTime.replace(' ', 'T') + '+07:00')
    
    // Initial check
    const checkTime = () => {
      const now = new Date()
      const diffMs = expDate.getTime() - now.getTime()
      if (diffMs <= 0) {
        setCountdown('Kedaluwarsa')
        return false
      } else {
        const mins = Math.floor(diffMs / 60000)
        const secs = Math.floor((diffMs % 60000) / 1000)
        setCountdown(`${mins}:${secs < 10 ? '0' : ''}${secs}`)
        return true
      }
    }
    
    checkTime()

    const timer = setInterval(() => {
      const keepGoing = checkTime()
      if (!keepGoing) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [qrisExpiryTime])

  const handleCheckStatus = async () => {
    if (!qrisHistoryId) return

    setCheckingPayment(true)
    const toastId = showToast('Memeriksa status pembayaran...', 'loading')
    
    try {
      const res = await checkQRISPaymentStatus(order.id, qrisHistoryId)
      dismissToast(toastId)
      
      if (res.success) {
        if (res.isPaid) {
          showToast('Pembayaran terverifikasi! Pesanan Anda sedang diproses.', 'success')
          setQrisSuccess(true)
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          showToast('Belum ada pembayaran terdeteksi. Silakan selesaikan pembayaran.', 'error', 3000)
        }
      } else {
        showToast(res.error || 'Gagal mengecek status pembayaran.', 'error')
      }
    } catch (err) {
      dismissToast(toastId)
      showToast('Terjadi kesalahan saat mengecek status.', 'error')
    } finally {
      setCheckingPayment(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleClearFile = () => {
    setImageFile(null)
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    showToast('Teks berhasil disalin!', 'success', 2000)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) {
      showToast('Silakan pilih file bukti transfer terlebih dahulu.', 'error')
      return
    }

    const loadingToastId = showToast('Mengunggah bukti transfer...', 'loading')

    const formData = new FormData()
    formData.append('file', imageFile)

    startTransition(async () => {
      const res = await submitPaymentProof(order.id, formData)
      if (res.error) {
        showToast(`Gagal mengunggah bukti: ${res.error}`, 'error')
      } else {
        showToast('Bukti transfer berhasil dikirim. Menunggu verifikasi admin.', 'success')
        setImageFile(null)
        setPreviewUrl(null)
        // Reload page to reflect changes
        setTimeout(() => window.location.reload(), 800)
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-neutral-1/10 overflow-hidden shadow-sm flex flex-col font-sans">
      {/* Card Header */}
      <div className="bg-brand-surface border-b border-brand-neutral-1/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-2 flex-wrap">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">ID Pesanan</span>
            <span className="text-xs font-mono font-semibold text-brand-primary">{order.id}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Tanggal</span>
            <span className="text-xs font-semibold text-brand-primary">
              {new Date(order.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Metode Bayar</span>
            <span className="text-xs font-semibold text-brand-primary">
              {order.payment_method === 'Bank Transfer' ? 'Transfer BCA' : order.payment_method === 'E-wallet' ? 'E-Wallet (Dana/GoPay)' : order.payment_method}
            </span>
          </div>
        </div>
        
        {/* Badges Container */}
        <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-brand-primary/55 font-bold">Bayar:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                paymentStatusColors[order.payment_status || 'Unpaid'] || 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {(order.payment_status === 'Unpaid' || !order.payment_status) && 'Belum Bayar'}
              {order.payment_status === 'Waiting Verification' && 'Menunggu Verifikasi'}
              {order.payment_status === 'Paid' && 'Lunas'}
              {order.payment_status === 'Rejected' && 'Pembayaran Ditolak'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-brand-primary/55 font-bold">Proses:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                statusColors[order.status] || 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body (Items list) */}
      <div className="p-6 divide-y divide-brand-neutral-1/10 flex-grow">
        {order.order_items?.map((item: any) => (
          <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
            <div className="relative w-16 h-16 bg-brand-surface rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={item.products?.image_url || '/placeholder.png'}
                alt={item.products?.name || 'Bunga'}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-sm font-semibold text-brand-primary">
                  {item.products?.name || 'Produk Dihapus'}
                </h4>
                <p className="text-xs text-brand-primary/60 font-sans mt-0.5">
                  Ukuran: {item.products?.size || '-'} | Warna: {item.products?.color || '-'}
                </p>
                {order.status === 'Completed' && item.products && (
                  <div className="mt-2 text-left">
                    <OrderReviewButton
                      productId={item.product_id}
                      productName={item.products.name}
                      productImage={item.products.image_url}
                      initialReview={userReviews.find((r: any) => r.product_id === item.product_id)}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-10">
                <span className="text-xs text-brand-primary/70 font-sans">
                  {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                </span>
                <span className="text-sm font-semibold text-brand-primary font-sans">
                  Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Card Footer (Shipping and Total Info) */}
      <div className="bg-brand-surface/30 border-t border-brand-neutral-1/10 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="text-xs text-brand-primary/70 max-w-md space-y-1">
          <div>
            <span className="font-semibold text-brand-primary">Alamat Kirim: </span>
            {order.shipping_name} ({order.shipping_phone}) - {order.shipping_address}
          </div>
          {order.shipping_courier && (
            <div>
              <span className="font-semibold text-brand-primary">Kurir Pengiriman: </span>
              <span className="bg-brand-accent-soft/20 text-brand-accent-bold font-bold px-2 py-0.5 rounded text-[10px] uppercase font-sans">
                {order.shipping_courier}
              </span>
            </div>
          )}
        </div>
        <div className="w-full md:w-auto flex flex-col items-end gap-1.5 border-t md:border-t-0 border-brand-neutral-1/10 pt-4 md:pt-0">
          {order.shipping_fee && order.shipping_fee > 0 ? (
            <>
              <div className="flex justify-between md:justify-end w-full md:w-auto gap-10 text-xs text-brand-primary/60">
                <span>Subtotal Bouquet:</span>
                <span>Rp {(Number(order.total_amount) - Number(order.shipping_fee)).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between md:justify-end w-full md:w-auto gap-10 text-xs text-brand-primary/60">
                <span>Ongkos Kirim:</span>
                <span>Rp {Number(order.shipping_fee).toLocaleString('id-ID')}</span>
              </div>
            </>
          ) : null}
          <div className="flex justify-between md:justify-end w-full md:w-auto gap-10 items-baseline font-serif text-sm font-bold text-brand-primary">
            <span>Total Bayar:</span>
            <span className="text-lg text-brand-accent-bold">
              Rp {Number(order.total_amount).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Message Banner (If Any) */}
      {order.admin_message && (
        <div className="mx-6 mb-6 p-4 rounded-xl border border-brand-accent-bold/25 bg-brand-accent-bold/5 flex gap-3 items-start animate-fade-in">
          <svg className="w-5 h-5 text-brand-accent-bold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <div>
            <span className="block text-xs font-bold text-brand-accent-bold uppercase tracking-wider">Pesan Admin Zoéflorist</span>
            <p className="text-xs text-brand-primary/85 mt-1 font-sans leading-relaxed">
              {order.admin_message}
            </p>
          </div>
        </div>
      )}

      {/* Payment Instruction & Proof Upload Panel */}
      <div className="border-t border-brand-neutral-1/10 px-6 py-6 bg-brand-surface/20 flex flex-col gap-6">
        <h4 className="font-serif text-sm font-bold text-brand-primary uppercase tracking-wider">
          Informasi & Pembayaran Bukti Transfer
        </h4>

        {!order.payment_status || order.payment_status === 'Unpaid' || order.payment_status === 'Rejected' ? (
          order.payment_method === 'QRIS' && !showManualUpload ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-neutral-1/15 shadow-sm space-y-6 flex flex-col items-center animate-fade-in text-center max-w-2xl mx-auto w-full font-sans">
              
              {/* Stepper Progress */}
              <div className="w-full max-w-md mx-auto mb-2 px-2">
                <div className="relative flex items-center justify-between">
                  {/* Background Line */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-neutral-1/30 -z-10 rounded"></div>
                  
                  {/* Progress Line */}
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-accent-bold -z-10 rounded transition-all duration-700 ease-in-out"
                    style={{ 
                      width: qrisSuccess ? '100%' : checkingPayment ? '80%' : qrisString ? '50%' : '15%' 
                    }}
                  ></div>

                  {/* Step 1 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-500 ${
                      qrisSuccess || checkingPayment || qrisString 
                        ? 'bg-brand-accent-bold text-white scale-105' 
                        : 'bg-brand-neutral-1/50 text-brand-primary'
                    }`}>
                      1
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold mt-1 text-brand-primary/80">Pindai QR</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-500 ${
                      qrisSuccess || checkingPayment || qrisString 
                        ? 'bg-brand-accent-bold text-white scale-105' 
                        : 'bg-brand-neutral-1/50 text-brand-primary/50'
                    }`}>
                      2
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold mt-1 text-brand-primary/80">Bayar Pas</span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-500 ${
                      qrisSuccess 
                        ? 'bg-green-600 text-white scale-110' 
                        : checkingPayment 
                          ? 'bg-brand-accent-bold text-white scale-110 animate-pulse' 
                          : 'bg-brand-surface border border-brand-neutral-1/30 text-brand-primary/50'
                    }`}>
                      {qrisSuccess ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        '3'
                      )}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold mt-1 transition-colors duration-500 ${
                      qrisSuccess ? 'text-green-700' : checkingPayment ? 'text-brand-accent-bold' : 'text-brand-primary/50'
                    }`}>
                      Verifikasi
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Info */}
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  Dynamic QRIS Aktif
                </div>
                <h5 className="font-serif text-lg sm:text-xl font-bold text-brand-primary">Scan QRIS DANA di Bawah</h5>
                <p className="text-xs text-brand-primary/60 max-w-md">
                  Pindai menggunakan aplikasi e-wallet (DANA, OVO, GoPay, ShopeePay, LinkAja) atau m-Banking pilihan Anda.
                </p>
              </div>

              {/* QR Code Frame */}
              {qrisLoading ? (
                <div className="w-52 h-52 sm:w-56 sm:h-56 bg-brand-surface/60 rounded-3xl border border-brand-neutral-1/10 flex flex-col items-center justify-center gap-3 shadow-inner glass-panel animate-pulse">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-3 border-brand-accent-soft/30 rounded-full"></div>
                    <div className="absolute inset-0 border-3 border-t-brand-accent-bold rounded-full animate-spin"></div>
                  </div>
                  <span className="text-[10px] text-brand-primary/55 font-bold tracking-wide animate-pulse">Menyiapkan QR Code...</span>
                </div>
              ) : qrisError ? (
                <div className="w-full max-w-md p-5 rounded-2xl bg-red-50/80 border border-red-200 text-red-700 text-xs flex flex-col items-center gap-3 shadow-sm glass-panel animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-center leading-relaxed">{qrisError}</p>
                  <button
                    type="button"
                    onClick={() => setShowManualUpload(true)}
                    className="mt-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer shadow-sm active:scale-95 font-sans"
                  >
                    Gunakan Transfer Manual
                  </button>
                </div>
              ) : qrisString ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* QRIS Code Image with Scanline Animation */}
                  <div className="relative p-4 bg-white border border-brand-neutral-1/10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] flex items-center justify-center overflow-hidden glow-glow w-52 h-52 sm:w-56 sm:h-56">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrisString)}`}
                      alt="Dynamic QRIS"
                      className="w-full h-full object-contain rounded-xl select-none"
                    />
                    
                    {/* The Scanline animation element */}
                    {!qrisSuccess && !checkingPayment && (
                      <div className="qris-scanner-line"></div>
                    )}

                    {/* Loader during payment check */}
                    {checkingPayment && (
                      <div className="absolute inset-0 bg-brand-primary/50 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-4 animate-fade-in">
                        <div className="relative w-10 h-10 mb-2">
                          <div className="absolute inset-0 border-3 border-white/20 rounded-full"></div>
                          <div className="absolute inset-0 border-3 border-t-white rounded-full animate-spin"></div>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">Memeriksa Pembayaran...</span>
                      </div>
                    )}

                    {/* Success Overlay with Confetti details */}
                    {qrisSuccess && (
                      <div className="absolute inset-0 bg-green-600/95 flex flex-col items-center justify-center text-white p-4 animate-fade-in">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-green-600 mb-2 shadow-lg scale-110 animate-bounce">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="font-serif text-sm font-bold tracking-wide">Lunas Terverifikasi!</span>
                        <span className="text-[9px] text-white/75 mt-1">Mengalihkan halaman...</span>
                      </div>
                    )}
                  </div>

                  {/* QRIS Logo Details with modern styling */}
                  <div className="flex items-center gap-3 bg-brand-surface-low px-4 py-1.5 rounded-full border border-brand-neutral-1/15 select-none shadow-sm transition-all duration-300 hover:bg-brand-surface">
                    <div className="font-serif font-black text-xs tracking-tighter text-blue-900 flex items-center gap-0.5">
                      <span className="text-red-650">Q</span>
                      <span className="text-cyan-600">R</span>
                      <span className="text-amber-500">I</span>
                      <span className="text-blue-900">S</span>
                    </div>
                    <div className="w-px h-3 bg-brand-neutral-1/30"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="font-sans font-bold text-[9px] uppercase tracking-wider text-brand-primary/60">DANA DYNAMIC QR</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Payment Details with Digital Ticket Style */}
              {!qrisLoading && !qrisError && qrisString && (
                <div className="w-full max-w-lg bg-brand-surface/40 rounded-3xl border border-brand-neutral-1/10 p-5 gap-4 flex flex-col sm:flex-row text-left shadow-inner glass-panel relative overflow-hidden">
                  
                  {/* Amount section */}
                  <div className="flex-1 space-y-1">
                    <span className="block text-[9px] uppercase tracking-wider text-brand-primary/55 font-bold">Total Pembayaran</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-mono font-black text-brand-accent-bold block tracking-tight">
                        Rp {qrisFinalAmount ? qrisFinalAmount.toLocaleString('id-ID') : Number(order.total_amount).toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const amountStr = qrisFinalAmount ? String(qrisFinalAmount) : String(order.total_amount);
                          navigator.clipboard.writeText(amountStr);
                          setCopiedAmount(true);
                          showToast('Nominal berhasil disalin!', 'success', 2000);
                          setTimeout(() => setCopiedAmount(false), 2000);
                        }}
                        className="p-1 rounded-lg bg-brand-accent-soft/20 hover:bg-brand-accent-soft/40 text-brand-accent-bold transition-all duration-300 active:scale-90 cursor-pointer flex items-center justify-center"
                        title="Salin nominal"
                      >
                        {copiedAmount ? (
                          <svg className="w-3.5 h-3.5 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <span className="block text-[8px] text-brand-primary/50 font-medium">
                      *Masukkan nominal pas. QRIS dinamis memproses transfer secara otomatis.
                    </span>
                  </div>
                  
                  {/* Divider */}
                  <div className="hidden sm:block w-px bg-brand-neutral-1/15 my-1"></div>
                  
                  {/* Timer section */}
                  <div className="flex-1 space-y-1 sm:pl-4">
                    <span className="block text-[9px] uppercase tracking-wider text-brand-primary/55 font-bold">Batas Waktu Bayar</span>
                    <div className="flex items-center gap-1.5">
                      <svg className={`w-4 h-4 ${countdown === 'Kedaluwarsa' ? 'text-red-500' : 'text-brand-accent-bold animate-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`text-xl font-mono font-black block tracking-tight ${
                        countdown === 'Kedaluwarsa' 
                          ? 'text-red-600' 
                          : countdown.split(':')[0] === '00' || Number(countdown.split(':')[0]) < 3 
                            ? 'text-amber-605 animate-pulse font-bold' 
                            : 'text-brand-primary'
                      }`}>
                        {countdown}
                      </span>
                    </div>
                    <span className="block text-[8px] text-brand-primary/50 font-medium">
                      *Pembayaran setelah waktu habis tidak dapat diverifikasi otomatis.
                    </span>
                  </div>
                </div>
              )}

              {/* Panduan E-Wallet Collapsible */}
              {!qrisLoading && !qrisError && qrisString && (
                <div className="w-full max-w-lg border border-brand-neutral-1/10 rounded-2xl bg-brand-surface/20 p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Panduan Pembayaran Instan</span>
                    <span className="text-[9px] text-brand-primary/50 font-semibold">Ketuk logo e-wallet Anda</span>
                  </div>
                  
                  {/* Wallet Selector Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'dana', name: 'DANA', color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300' },
                      { id: 'gopay', name: 'GoPay', color: 'hover:bg-green-50 hover:text-green-700 hover:border-green-300' },
                      { id: 'ovo', name: 'OVO', color: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300' },
                      { id: 'shopeepay', name: 'ShopeePay', color: 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300' }
                    ].map((wallet) => (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setActiveGuide(activeGuide === wallet.id ? null : (wallet.id as any))}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all duration-300 cursor-pointer shadow-sm active:scale-95 ${
                          activeGuide === wallet.id
                            ? 'bg-brand-primary text-white border-brand-primary scale-105'
                            : `bg-white text-brand-primary/70 border-brand-neutral-1/15 ${wallet.color}`
                        }`}
                      >
                        {wallet.name}
                      </button>
                    ))}
                  </div>

                  {/* Guides Content Panel with Fade In */}
                  {activeGuide && (
                    <div className="p-3.5 bg-white rounded-xl border border-brand-neutral-1/15 text-xs text-brand-primary/80 space-y-2 animate-fade-in font-sans">
                      {activeGuide === 'dana' && (
                        <>
                          <div className="font-bold text-blue-700 text-[10px] uppercase mb-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-blue-705"></span> DANA Quick Guide
                          </div>
                          <div className="flex gap-2"><span className="font-bold text-blue-600">1.</span> Buka aplikasi DANA di HP Anda.</div>
                          <div className="flex gap-2"><span className="font-bold text-blue-600">2.</span> Ketuk menu <strong className="text-brand-primary">Pay / Pindai</strong> di bagian tengah bawah.</div>
                          <div className="flex gap-2"><span className="font-bold text-blue-600">3.</span> Arahkan kamera ke kode QRIS di atas, lalu konfirmasi bayar.</div>
                        </>
                      )}
                      {activeGuide === 'gopay' && (
                        <>
                          <div className="font-bold text-green-700 text-[10px] uppercase mb-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-green-700"></span> GoPay Quick Guide
                          </div>
                          <div className="flex gap-2"><span className="font-bold text-green-600">1.</span> Buka aplikasi Gojek atau GoPay.</div>
                          <div className="flex gap-2"><span className="font-bold text-green-600">2.</span> Ketuk tombol <strong className="text-brand-primary">Bayar / Pay</strong>.</div>
                          <div className="flex gap-2"><span className="font-bold text-green-600">3.</span> Pindai kode QRIS, masukkan PIN Anda, lalu konfirmasi.</div>
                        </>
                      )}
                      {activeGuide === 'ovo' && (
                        <>
                          <div className="font-bold text-purple-700 text-[10px] uppercase mb-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-purple-700"></span> OVO Quick Guide
                          </div>
                          <div className="flex gap-2"><span className="font-bold text-purple-600">1.</span> Buka aplikasi OVO di HP.</div>
                          <div className="flex gap-2"><span className="font-bold text-purple-600">2.</span> Ketuk tombol <strong className="text-brand-primary">QRIS / Scan</strong> di layar utama.</div>
                          <div className="flex gap-2"><span className="font-bold text-purple-600">3.</span> Pindai kode QRIS, pilih pembayaran Cash/Points, dan selesaikan.</div>
                        </>
                      )}
                      {activeGuide === 'shopeepay' && (
                        <>
                          <div className="font-bold text-orange-700 text-[10px] uppercase mb-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-orange-700"></span> ShopeePay Quick Guide
                          </div>
                          <div className="flex gap-2"><span className="font-bold text-orange-600">1.</span> Buka aplikasi Shopee, pilih ikon <strong className="text-brand-primary">Bayar / Scan</strong>.</div>
                          <div className="flex gap-2"><span className="font-bold text-orange-600">2.</span> Arahkan kamera ke kode QRIS di atas.</div>
                          <div className="flex gap-2"><span className="font-bold text-orange-600">3.</span> Masukkan nominal pas jika diminta, masukkan PIN ShopeePay.</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions & Verification */}
              {!qrisLoading && !qrisError && qrisString && (
                <div className="w-full space-y-4">
                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    disabled={checkingPayment || countdown === 'Kedaluwarsa' || qrisSuccess}
                    className="w-full bg-brand-accent-bold text-white text-xs font-bold uppercase tracking-wider py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-brand-accent-bold/90 disabled:opacity-50 transition-all duration-300 hover:scale-[1.01] active:scale-98 cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    {checkingPayment ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Memverifikasi Pembayaran...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Cek Status Pembayaran
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-brand-primary/50 max-w-sm mx-auto leading-relaxed">
                    Sistem akan memverifikasi transaksi Anda secara otomatis. Klik tombol di atas untuk cek pembayaran Anda jika belum terupdate.
                  </p>

                  <div className="pt-2 border-t border-brand-neutral-1/10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowManualUpload(true)}
                      className="text-[10px] font-bold text-brand-primary/60 hover:text-brand-accent-bold transition-all duration-300 cursor-pointer underline decoration-dotted underline-offset-4"
                    >
                      Mengalami kendala? Unggah bukti transfer manual di sini
                    </button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left: Payment Info */}
              <div className="bg-white p-5 rounded-2xl border border-brand-neutral-1/15 space-y-4 shadow-inner">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-brand-primary/50 font-bold block">Nominal Harus Dibayar:</span>
                  <span className="text-xl font-mono font-bold text-brand-accent-bold">
                    Rp {Number(order.total_amount).toLocaleString('id-ID')}
                  </span>
                  <span className="block text-[9px] text-brand-primary/40 font-semibold mt-1">
                    *Pastikan nominal transfer sama persis hingga digit terakhir.
                  </span>
                </div>

                <div className="border-t border-brand-neutral-1/10 pt-4">
                  <span className="text-[10px] uppercase tracking-wider text-brand-primary/50 font-bold block mb-2">Instruksi Pembayaran:</span>
                  
                  {/* Method BCA */}
                  {order.payment_method === 'Bank Transfer' && (
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center gap-3 bg-brand-surface/40 p-3 rounded-xl border border-brand-neutral-1/10">
                        <div className="w-12 h-6 relative bg-white border border-brand-neutral-1/25 rounded flex items-center justify-center font-bold text-blue-800 text-[10px] tracking-wide select-none">
                          BCA
                        </div>
                        <div className="flex-grow">
                          <span className="block text-xs font-semibold text-brand-primary font-mono">1672806768</span>
                          <span className="block text-[10px] text-brand-primary/60">a/n zoeflorist</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy('1672806768')}
                          className="text-[10px] uppercase font-bold tracking-wider text-brand-accent-bold hover:underline cursor-pointer focus:outline-none"
                        >
                          {copiedText ? 'Disalin!' : 'Salin Rek'}
                        </button>
                      </div>
                      <p className="text-[10px] text-brand-primary/70 leading-relaxed">
                        Silakan lakukan transfer antar bank ke rekening Bank BCA di atas, lalu unggah bukti transfer di form sebelah kanan.
                      </p>
                    </div>
                  )}

                  {/* Method E-Wallet */}
                  {order.payment_method === 'E-wallet' && (
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center gap-3 bg-brand-surface/40 p-3 rounded-xl border border-brand-neutral-1/10">
                        <div className="w-12 h-6 relative bg-white border border-brand-neutral-1/25 rounded flex items-center justify-center font-bold text-green-700 text-[9px] uppercase tracking-tight select-none">
                          DANA/GOPAY
                        </div>
                        <div className="flex-grow">
                          <span className="block text-xs font-semibold text-brand-primary font-mono">085817112126</span>
                          <span className="block text-[10px] text-brand-primary/60">a/n zoeflorist</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy('085817112126')}
                          className="text-[10px] uppercase font-bold tracking-wider text-brand-accent-bold hover:underline cursor-pointer focus:outline-none"
                        >
                          {copiedText ? 'Disalin!' : 'Salin No'}
                        </button>
                      </div>
                      <p className="text-[10px] text-brand-primary/70 leading-relaxed">
                        Silakan lakukan transfer saldo e-wallet Dana atau GoPay Anda ke nomor di atas, kemudian unggah struk transaksinya.
                      </p>
                    </div>
                  )}

                  {/* Method QRIS */}
                  {order.payment_method === 'QRIS' && (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="relative w-36 h-48 bg-white border border-brand-neutral-1/20 p-2 rounded-xl shadow-md">
                        <Image
                          src="/qris.png"
                          alt="QRIS zoeflorist"
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <p className="text-[10px] text-brand-primary/70 leading-relaxed text-center font-sans">
                        Pindai kode QRIS di atas dengan aplikasi bank atau e-wallet pilihan Anda (Dana, GoPay, OVO, ShopeePay, LinkAja).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Upload Form */}
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <span className="text-[10px] uppercase tracking-wider text-brand-primary/50 font-bold block">Unggah Bukti Transfer:</span>
                
                {!previewUrl ? (
                  <div className="relative border border-dashed border-brand-neutral-1/80 rounded-2xl p-6 bg-white hover:bg-brand-surface smooth-transition flex flex-col items-center justify-center cursor-pointer min-h-[140px]">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <svg className="w-10 h-10 text-brand-primary/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-brand-primary/70 text-center">Pilih Gambar Struk/Bukti Transfer</span>
                    <span className="text-[9px] text-brand-primary/40 text-center mt-1">Format gambar .png, .jpg (Maksimal 5MB)</span>
                  </div>
                ) : (
                  <div className="relative border border-brand-neutral-1/10 rounded-2xl p-4 bg-white flex items-center gap-4 shadow-sm">
                    <div className="relative w-16 h-16 bg-brand-surface rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={previewUrl}
                        alt="Pratinjau Bukti"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <span className="block text-xs font-semibold text-brand-primary truncate">{imageFile?.name}</span>
                      <span className="block text-[10px] text-brand-primary/45">{(imageFile!.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 rounded-full hover:bg-brand-surface text-brand-primary/50 hover:text-brand-accent-bold smooth-transition cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || !imageFile}
                  className="w-full bg-brand-primary text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-full shadow hover:bg-brand-primary/95 disabled:opacity-50 smooth-transition cursor-pointer"
                >
                  {isPending ? 'Mengirim Bukti...' : 'Kirim Bukti Pembayaran'}
                </button>
              </form>
            </div>
          )
        ) : order.payment_status === 'Waiting Verification' ? (
          <div className="flex flex-col sm:flex-row gap-6 items-center bg-white p-5 rounded-2xl border border-brand-neutral-1/15 shadow-sm">
            <div className="relative w-24 h-32 bg-brand-surface rounded-xl border border-brand-neutral-1/20 overflow-hidden shadow-inner flex-shrink-0">
              {order.payment_proof_url ? (
                <Image
                  src={order.payment_proof_url}
                  alt="Bukti Transfer Pengguna"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-brand-primary/40 font-sans">No Image</div>
              )}
            </div>
            <div className="flex-grow space-y-2 text-center sm:text-left">
              <span className="inline-flex px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-850 text-[10px] font-bold">
                Bukti Transfer Dikirim
              </span>
              <p className="text-xs text-brand-primary/80 leading-relaxed font-sans">
                Bukti transfer Anda sedang dicek secara berkala oleh tim admin kami. Status pesanan akan otomatis berpindah ke **Processing** jika nominal sudah terverifikasi lunas. Terima kasih atas kesabaran Anda.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 items-center bg-green-50/50 p-5 rounded-2xl border border-green-200/50 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 font-sans">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-grow text-center sm:text-left">
              <h5 className="text-xs font-bold text-green-800 font-sans">Pembayaran Terverifikasi Lunas</h5>
              <p className="text-xs text-brand-primary/70 mt-1 leading-relaxed font-sans">
                Transaksi ini telah diselesaikan. Staf kami sedang merangkai dan memproses pengiriman bouquet bunga pesanan Anda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
