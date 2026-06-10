'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { updateOrderStatus, verifyPayment, sendAdminMessage, updatePaymentStatus } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

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
  products: Product
}

interface UserProfile {
  name: string
  email: string
}

interface Order {
  id: string
  user_id: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
  total_amount: number
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  payment_method: string
  created_at: string
  profiles: UserProfile
  order_items: OrderItem[]
  payment_proof_url: string | null
  payment_status: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected'
  admin_message: string | null
}

interface OrderManagementClientProps {
  initialOrders: Order[]
}

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Processing: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const paymentStatusColors: Record<string, string> = {
  Unpaid: 'bg-zinc-50 text-zinc-650 border-zinc-200',
  'Waiting Verification': 'bg-sky-50 text-sky-700 border-sky-200',
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function OrderManagementClient({ initialOrders }: OrderManagementClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Portal and Zoom Image States
  const [mounted, setMounted] = useState(false)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  // Interactive inputs per order
  const [adminMessages, setAdminMessages] = useState<Record<string, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [isRejecting, setIsRejecting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: any) => {
    const loadingToastId = showToast('Mengubah status pesanan...', 'loading')

    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus)
      if (res.error) {
        showToast(`Gagal mengubah status: ${res.error}`, 'error')
      } else {
        showToast(`Status pesanan ${orderId.slice(0, 8)}... berhasil diperbarui!`, 'success')
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected') => {
    let reason: string | undefined = undefined
    if (newPaymentStatus === 'Rejected') {
      const inputReason = window.prompt('Masukkan alasan penolakan pembayaran (opsional):')
      if (inputReason !== null) {
        reason = inputReason
      }
    }

    const loadingToastId = showToast('Mengubah status pembayaran...', 'loading')

    startTransition(async () => {
      const res = await updatePaymentStatus(orderId, newPaymentStatus, reason)
      if (res.error) {
        showToast(`Gagal mengubah status pembayaran: ${res.error}`, 'error')
      } else {
        showToast('Status pembayaran berhasil diperbarui!', 'success')
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const handleVerify = async (orderId: string, isApproved: boolean) => {
    const reason = rejectionReasons[orderId] || ''
    if (!isApproved && !reason.trim()) {
      showToast('Alasan penolakan harus diisi.', 'error')
      return
    }

    const loadingToastId = showToast(
      isApproved ? 'Menyetujui pembayaran...' : 'Menolak pembayaran...',
      'loading'
    )

    startTransition(async () => {
      const res = await verifyPayment(orderId, isApproved, isApproved ? undefined : reason)
      if (res.error) {
        showToast(`Gagal memverifikasi: ${res.error}`, 'error')
      } else {
        showToast(
          isApproved ? 'Pembayaran disetujui & pesanan diproses!' : 'Pembayaran ditolak.',
          'success'
        )
        setIsRejecting((prev) => ({ ...prev, [orderId]: false }))
        setRejectionReasons((prev) => ({ ...prev, [orderId]: '' }))
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const handleSendMessage = async (orderId: string) => {
    const message = adminMessages[orderId] || ''
    if (!message.trim()) {
      showToast('Pesan tidak boleh kosong.', 'error')
      return
    }

    const loadingToastId = showToast('Mengirim pesan...', 'loading')

    startTransition(async () => {
      const res = await sendAdminMessage(orderId, message)
      if (res.error) {
        showToast(`Gagal mengirim pesan: ${res.error}`, 'error')
      } else {
        showToast('Pesan berhasil dikirim ke pelanggan!', 'success')
        setAdminMessages((prev) => ({ ...prev, [orderId]: '' }))
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  const adminNav = [
    { name: 'Ringkasan', href: '/admin/dashboard', active: false },
    { name: 'Kelola Produk', href: '/admin/produk', active: false },
    { name: 'Kelola Pesanan', href: '/admin/pesanan', active: true },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      {/* Admin Title & Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-neutral-1/20 pb-6 mb-10 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-primary">Manajemen Pesanan</h1>
          <p className="text-sm text-brand-primary/60 mt-1 font-sans">Proses transaksi dan kirim pesanan pelanggan</p>
        </div>

        {/* Admin Navigation */}
        <div className="flex flex-wrap gap-2">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider smooth-transition ${
                item.active
                  ? 'bg-brand-primary text-white'
                  : 'bg-white text-brand-primary border border-brand-neutral-1/30 hover:bg-brand-surface'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="w-full bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          {initialOrders.length > 0 ? (
            <table className="w-full min-w-[800px] text-left border-collapse font-sans">
              <thead>
                <tr className="bg-brand-surface text-[10px] uppercase tracking-wider font-semibold text-brand-primary/70 border-b border-brand-neutral-1/10">
                  <th className="py-4 px-6 w-10"></th>
                  <th className="py-4 px-6">ID Pesanan</th>
                  <th className="py-4 px-6">Pelanggan</th>
                  <th className="py-4 px-6">Tanggal Order</th>
                  <th className="py-4 px-6">Total Tagihan</th>
                  <th className="py-4 px-6">Status Bayar</th>
                  <th className="py-4 px-6">Status Operasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-neutral-1/10 text-sm">
                {initialOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id
                  return (
                    <tbody key={order.id} className="divide-y divide-brand-neutral-1/10">
                      {/* Main Order Row */}
                      <tr
                        onClick={() => toggleExpandOrder(order.id)}
                        className={`hover:bg-brand-surface/20 smooth-transition cursor-pointer ${
                          isExpanded ? 'bg-brand-surface/30' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-brand-primary/40 font-bold">
                          {isExpanded ? '▲' : '▼'}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs font-semibold text-brand-primary">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold">{order.profiles?.name || 'Pelanggan'}</div>
                          <div className="text-xs text-brand-primary/60">{order.profiles?.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-6 font-bold text-brand-accent-bold">
                          Rp {Number(order.total_amount).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={order.payment_status || 'Unpaid'}
                            disabled={isPending}
                            onChange={(e) => handlePaymentStatusChange(order.id, e.target.value as any)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border focus:outline-none cursor-pointer smooth-transition ${
                              paymentStatusColors[order.payment_status || 'Unpaid'] || 'bg-zinc-100 text-zinc-850'
                            }`}
                          >
                            <option value="Unpaid">Belum Bayar</option>
                            <option value="Waiting Verification">Menunggu Verifikasi</option>
                            <option value="Paid">Lunas</option>
                            <option value="Rejected">Ditolak</option>
                          </select>
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <select
                              value={order.status}
                              disabled={isPending}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border focus:outline-none cursor-pointer ${
                                statusColors[order.status] || 'bg-zinc-100 text-zinc-855'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable details row */}
                      {isExpanded && (
                        <tr className="bg-brand-surface/10">
                          <td colSpan={7} className="py-6 px-12 border-t border-b border-brand-neutral-1/10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
                              {/* Left: Products items */}
                              <div>
                                <h4 className="font-serif text-sm font-bold text-brand-primary mb-3 uppercase tracking-wider">Detail Bouquet</h4>
                                <div className="space-y-3">
                                  {order.order_items?.map((item) => (
                                    <div key={item.id} className="flex gap-3 items-center">
                                      <div className="relative w-10 h-10 bg-brand-surface rounded overflow-hidden flex-shrink-0">
                                        <Image
                                          src={item.products?.image_url || '/placeholder.png'}
                                          alt={item.products?.name || 'Bunga'}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      <div className="flex-grow text-xs">
                                        <div className="font-semibold text-brand-primary">{item.products?.name}</div>
                                        <div className="text-brand-primary/60">
                                          Ukuran: {item.products?.size} | Warna: {item.products?.color}
                                        </div>
                                      </div>
                                      <div className="text-xs text-right text-brand-primary font-semibold font-sans">
                                        {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Middle: Shipping details */}
                              <div>
                                <h4 className="font-serif text-sm font-bold text-brand-primary mb-3 uppercase tracking-wider">Info Alamat Pengiriman</h4>
                                <div className="text-xs text-brand-primary/80 space-y-2 leading-relaxed">
                                  <div>
                                    <span className="font-semibold text-brand-primary">Penerima:</span> {order.shipping_name}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-brand-primary">WhatsApp:</span> {order.shipping_phone}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-brand-primary">Alamat Kirim:</span> {order.shipping_address}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-brand-primary">Metode Pembayaran:</span> {
                                      order.payment_method === 'Bank Transfer' ? 'Transfer BCA' : order.payment_method === 'E-wallet' ? 'E-Wallet (Dana/GoPay)' : order.payment_method
                                    }
                                  </div>
                                </div>
                              </div>

                              {/* Right: Payment verification & Admin Message */}
                              <div className="space-y-4">
                                <h4 className="font-serif text-sm font-bold text-brand-primary mb-3 uppercase tracking-wider">Verifikasi Pembayaran</h4>
                                <div className="text-xs text-brand-primary/80 space-y-2.5 leading-relaxed bg-white p-4 rounded-xl border border-brand-neutral-1/15 flex flex-col">
                                  <div>
                                    <span className="font-semibold text-brand-primary block mb-1">Status Pembayaran:</span>
                                    <select
                                      value={order.payment_status || 'Unpaid'}
                                      disabled={isPending}
                                      onChange={(e) => handlePaymentStatusChange(order.id, e.target.value as any)}
                                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border focus:outline-none cursor-pointer smooth-transition ${
                                        paymentStatusColors[order.payment_status || 'Unpaid']
                                      }`}
                                    >
                                      <option value="Unpaid">Belum Bayar</option>
                                      <option value="Waiting Verification">Menunggu Verifikasi</option>
                                      <option value="Paid">Lunas</option>
                                      <option value="Rejected">Ditolak</option>
                                    </select>
                                  </div>

                                  {/* Payment Proof Thumbnail */}
                                  <div className="pt-2 border-t border-brand-neutral-1/10">
                                    <span className="font-semibold text-brand-primary block mb-1.5">Bukti Transfer:</span>
                                    {order.payment_proof_url ? (
                                      <div 
                                        onClick={() => setZoomImageUrl(order.payment_proof_url)}
                                        className="relative w-24 h-32 bg-brand-surface rounded-xl border border-brand-neutral-1/25 overflow-hidden cursor-pointer hover:opacity-95 shadow smooth-transition group pointer-events-auto"
                                      >
                                        <Image
                                          src={order.payment_proof_url}
                                          alt="Bukti Pembayaran"
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                        <div className="absolute inset-0 bg-brand-primary/25 opacity-0 group-hover:opacity-100 flex items-center justify-center smooth-transition">
                                          <span className="text-[9px] font-bold text-white bg-brand-primary/85 px-1.5 py-0.5 rounded">Zoom</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-brand-primary/50 italic">Belum mengunggah bukti transfer</span>
                                    )}
                                  </div>
                                </div>

                                {/* Verification Buttons (Waiting Verification) */}
                                {order.payment_status === 'Waiting Verification' && (
                                  <div className="bg-brand-surface p-4 rounded-xl border border-brand-neutral-1/15 space-y-3">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-primary block">Aksi Verifikasi</span>
                                    
                                    {!isRejecting[order.id] ? (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleVerify(order.id, true)}
                                          className="flex-grow bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-full smooth-transition cursor-pointer shadow"
                                        >
                                          Setujui (Lunas)
                                        </button>
                                        <button
                                          onClick={() => setIsRejecting((prev) => ({ ...prev, [order.id]: true }))}
                                          className="bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded-full smooth-transition cursor-pointer shadow"
                                        >
                                          Tolak
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input
                                          type="text"
                                          required
                                          placeholder="Alasan penolakan (misal: nominal kurang)"
                                          value={rejectionReasons[order.id] || ''}
                                          onChange={(e) => setRejectionReasons((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                          className="w-full px-3 py-2 bg-white border border-brand-neutral-1/40 rounded-xl text-xs focus:outline-none"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleVerify(order.id, false)}
                                            className="flex-grow bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full smooth-transition cursor-pointer"
                                          >
                                            Kirim Penolakan
                                          </button>
                                          <button
                                            onClick={() => setIsRejecting((prev) => ({ ...prev, [order.id]: false }))}
                                            className="px-3 py-1.5 bg-white border border-brand-neutral-1/40 text-brand-primary text-[9px] font-bold uppercase tracking-wider rounded-full smooth-transition cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Admin Message Form */}
                                <div className="bg-brand-surface p-4 rounded-xl border border-brand-neutral-1/15 space-y-2.5">
                                  <label className="text-[10px] uppercase font-bold tracking-wider text-brand-primary block">Kirim Pesan ke Pelanggan</label>
                                  <textarea
                                    rows={2}
                                    placeholder="Tulis catatan (misal: Mohon segera upload bukti pembayaran)"
                                    value={adminMessages[order.id] || ''}
                                    onChange={(e) => setAdminMessages((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-brand-neutral-1/40 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                                  />
                                  <button
                                    onClick={() => handleSendMessage(order.id)}
                                    className="w-full bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider py-2 rounded-full smooth-transition cursor-pointer shadow hover:bg-brand-primary/95"
                                  >
                                    Kirim Pesan
                                  </button>

                                  {order.admin_message && (
                                    <div className="mt-2 bg-white p-2 rounded-lg border border-brand-neutral-1/10 text-[10px] text-brand-primary/70">
                                      <span className="font-semibold block text-brand-accent-bold">Pesan Terkirim:</span>
                                      "{order.admin_message}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 text-brand-primary/50">
              Belum ada pesanan terdaftar di sistem.
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Zoom Image Modal via Portal */}
      {zoomImageUrl && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-brand-primary/75 backdrop-blur-md z-[9999] cursor-zoom-out flex items-center justify-center p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center pointer-events-none">
            {/* Close button */}
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 cursor-pointer pointer-events-auto smooth-transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Large Image */}
            <div className="relative w-full h-full max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl pointer-events-auto">
              <Image
                src={zoomImageUrl}
                alt="Bukti Transfer Zoom"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
