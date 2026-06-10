'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { submitPaymentProof } from '@/app/actions/orders'
import { useToast } from '@/components/Toast'
import OrderReviewButton from '@/components/OrderReviewButton'

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
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Copy-to-clipboard state
  const [copiedText, setCopiedText] = useState(false)

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
      <div className="bg-brand-surface/30 border-t border-brand-neutral-1/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-xs text-brand-primary/70 max-w-md">
          <span className="font-semibold text-brand-primary">Alamat Kirim: </span>
          {order.shipping_name} ({order.shipping_phone}) - {order.shipping_address}
        </div>
        <div className="w-full sm:w-auto flex justify-between sm:justify-end items-baseline gap-4">
          <span className="text-sm text-brand-primary/80 font-semibold font-sans">Total Transaksi</span>
          <span className="text-lg font-serif font-bold text-brand-accent-bold">
            Rp {Number(order.total_amount).toLocaleString('id-ID')}
          </span>
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
                    <p className="text-[10px] text-brand-primary/70 leading-relaxed text-center">
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
                <div className="w-full h-full flex items-center justify-center text-[10px] text-brand-primary/40">No Image</div>
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
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-grow text-center sm:text-left">
              <h5 className="text-xs font-bold text-green-800">Pembayaran Terverifikasi Lunas</h5>
              <p className="text-xs text-brand-primary/70 mt-1 leading-relaxed">
                Transaksi ini telah diselesaikan. Staf kami sedang merangkai dan memproses pengiriman bouquet bunga pesanan Anda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
