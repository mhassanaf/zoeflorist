'use client'

import { useState, useTransition, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { updateOrderStatus, verifyPayment, sendAdminMessage, updatePaymentStatus, updateOrderShippingFee } from '@/app/actions/orders'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { createClient } from '@/utils/supabase/client'

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
interface Order {
  id: string
  total_amount: number
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  payment_method: string
  payment_proof_url: string | null
  payment_status: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected'
  admin_message: string | null
  created_at: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'
  profiles: { name: string | null; email: string | null } | null
  order_items: OrderItem[]
  shipping_fee?: number
  shipping_courier?: string | null
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
  const { showToast, dismissToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Sync state if initialOrders props change
  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  useEffect(() => {
    const supabase = createClient()

    const fetchSingleOrder = async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          shipping_name,
          shipping_phone,
          shipping_address,
          payment_method,
          payment_proof_url,
          payment_status,
          admin_message,
          created_at,
          status,
          shipping_fee,
          shipping_courier,
          profiles(name, email),
          order_items(
            id,
            quantity,
            price,
            product_id,
            products(id, name, image_url, size, color)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Error fetching realtime order detail:', error)
        return null
      }
      return data as any
    }

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          console.log('Realtime orders change captured:', payload)
          if (payload.eventType === 'INSERT') {
            const newOrder = await fetchSingleOrder(payload.new.id)
            if (newOrder) {
              setOrders((prev) => [newOrder, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = await fetchSingleOrder(payload.new.id)
            if (updatedOrder) {
              setOrders((prev) =>
                prev.map((o) => (o.id === payload.new.id ? updatedOrder : o))
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Portal and Zoom Image States
  const [mounted, setMounted] = useState(false)
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  // Custom Input Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    orderId: string | null
    actionType: 'verify_approve' | 'verify_reject' | 'status_change_paid' | 'status_change_rejected' | null
    newPaymentStatus?: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected' | null
    title: string
    placeholder: string
    value: string
  }>({
    isOpen: false,
    orderId: null,
    actionType: null,
    newPaymentStatus: null,
    title: '',
    placeholder: '',
    value: '',
  })

  // Interactive inputs per order
  const [adminMessages, setAdminMessages] = useState<Record<string, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [isRejecting, setIsRejecting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSetShippingFee = async (orderId: string, shippingFee: number) => {
    const loadingToastId = showToast('Menentukan ongkos kirim...', 'loading')
    startTransition(async () => {
      const res = await updateOrderShippingFee(orderId, shippingFee)
      dismissToast(loadingToastId)
      if (res.error) {
        showToast(`Gagal menentukan ongkir: ${res.error}`, 'error')
      } else {
        showToast('Ongkos kirim berhasil ditentukan!', 'success')
      }
    })
  }

  const handleStatusChange = async (orderId: string, newStatus: any) => {
    const loadingToastId = showToast('Mengubah status pesanan...', 'loading')

    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus)
      dismissToast(loadingToastId)
      if (res.error) {
        showToast(`Gagal mengubah status: ${res.error}`, 'error')
      } else {
        showToast(`Status pesanan ${orderId.slice(0, 8)}... berhasil diperbarui!`, 'success')
        router.refresh()
      }
    })
  }

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected') => {
    if (newPaymentStatus === 'Paid') {
      setModalState({
        isOpen: true,
        orderId,
        actionType: 'status_change_paid',
        newPaymentStatus,
        title: 'Verifikasi Pembayaran Lunas',
        placeholder: 'Masukkan perkiraan waktu pengerjaan (contoh: 2 Hari Kerja)',
        value: '',
      })
      return
    }
    if (newPaymentStatus === 'Rejected') {
      setModalState({
        isOpen: true,
        orderId,
        actionType: 'status_change_rejected',
        newPaymentStatus,
        title: 'Tolak Pembayaran',
        placeholder: 'Masukkan alasan penolakan pembayaran (contoh: Struk transfer tidak valid)',
        value: '',
      })
      return
    }

    const loadingToastId = showToast('Mengubah status pembayaran...', 'loading')

    startTransition(async () => {
      const res = await updatePaymentStatus(orderId, newPaymentStatus)
      dismissToast(loadingToastId)
      if (res.error) {
        showToast(`Gagal mengubah status pembayaran: ${res.error}`, 'error')
      } else {
        showToast('Status pembayaran berhasil diperbarui!', 'success')
        router.refresh()
      }
    })
  }

  const handleVerify = async (orderId: string, isApproved: boolean) => {
    if (isApproved) {
      setModalState({
        isOpen: true,
        orderId,
        actionType: 'verify_approve',
        title: 'Verifikasi Pembayaran Lunas',
        placeholder: 'Masukkan perkiraan waktu pengerjaan (contoh: 2 Hari Kerja)',
        value: '',
      })
    } else {
      setModalState({
        isOpen: true,
        orderId,
        actionType: 'verify_reject',
        title: 'Tolak Verifikasi Pembayaran',
        placeholder: 'Masukkan alasan penolakan pembayaran (wajib)',
        value: '',
      })
    }
  }

  const handleModalSubmit = async () => {
    const { orderId, actionType, value, newPaymentStatus } = modalState
    if (!orderId || !actionType) return

    if (actionType === 'verify_reject' && !value.trim()) {
      showToast('Alasan penolakan harus diisi.', 'error')
      return
    }

    // Close modal first
    setModalState((prev) => ({ ...prev, isOpen: false }))

    if (actionType === 'verify_approve') {
      const adminMsg = `Pembayaran terverifikasi Lunas. Perkiraan pengerjaan buket: ${value.trim() || 'Sedang diproses'}`
      const loadingToastId = showToast('Menyetujui pembayaran...', 'loading')
      startTransition(async () => {
        const res = await verifyPayment(orderId, true, adminMsg)
        dismissToast(loadingToastId)
        if (res.error) {
          showToast(`Gagal memverifikasi: ${res.error}`, 'error')
        } else {
          showToast('Pembayaran disetujui & pesanan diproses!', 'success')
        }
      })
    } else if (actionType === 'verify_reject') {
      const loadingToastId = showToast('Menolak pembayaran...', 'loading')
      startTransition(async () => {
        const res = await verifyPayment(orderId, false, value.trim())
        dismissToast(loadingToastId)
        if (res.error) {
          showToast(`Gagal menolak: ${res.error}`, 'error')
        } else {
          showToast('Pembayaran ditolak.', 'success')
        }
      })
    } else if (actionType === 'status_change_paid') {
      const adminMsg = `Pembayaran terverifikasi Lunas. Perkiraan pengerjaan buket: ${value.trim() || 'Sedang diproses'}`
      const loadingToastId = showToast('Mengubah status pembayaran...', 'loading')
      startTransition(async () => {
        const res = await updatePaymentStatus(orderId, 'Paid', adminMsg)
        dismissToast(loadingToastId)
        if (res.error) {
          showToast(`Gagal mengubah status pembayaran: ${res.error}`, 'error')
        } else {
          showToast('Status pembayaran berhasil diperbarui!', 'success')
        }
      })
    } else if (actionType === 'status_change_rejected') {
      const loadingToastId = showToast('Mengubah status pembayaran...', 'loading')
      startTransition(async () => {
        const res = await updatePaymentStatus(orderId, 'Rejected', value.trim() || undefined)
        dismissToast(loadingToastId)
        if (res.error) {
          showToast(`Gagal mengubah status pembayaran: ${res.error}`, 'error')
        } else {
          showToast('Status pembayaran ditolak.', 'success')
        }
      })
    }
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
      dismissToast(loadingToastId)
      if (res.error) {
        showToast(`Gagal mengirim pesan: ${res.error}`, 'error')
      } else {
        showToast('Pesan berhasil dikirim ke pelanggan!', 'success')
        setAdminMessages((prev) => ({ ...prev, [orderId]: '' }))
        router.refresh()
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-10 sm:pt-4 animate-fade-in-up">
      {/* Back Button */}
      <div className="mb-3 flex justify-start">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Admin Title & Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-neutral-1/20 pb-6 mb-6 gap-4">
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

      {/* Mobile Card List View (Visible only on mobile/tablet) */}
      <div className="lg:hidden space-y-6 mb-4">
        {orders.length > 0 ? (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden flex flex-col p-5 space-y-4">
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-brand-primary/50 font-bold">ID Pesanan</span>
                    <span className="text-sm font-mono font-semibold text-brand-primary">{order.id.slice(0, 8)}...</span>
                  </div>
                  <span className="text-sm text-brand-primary/60">
                    {new Date(order.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Customer name */}
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-brand-primary/50 font-bold">Pelanggan</span>
                  <div className="text-sm font-semibold text-brand-primary">{order.profiles?.name || 'Pelanggan'}</div>
                  <div className="text-xs text-brand-primary/50">{order.profiles?.email}</div>
                </div>

                {/* Total & Status selectors */}
                <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-brand-neutral-1/10">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-brand-primary/50 font-bold mb-1">Total Tagihan</span>
                    <span className="font-sans font-bold text-sm text-brand-accent-bold">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-brand-primary/50 font-bold mb-1">Status Bayar</span>
                    <select
                      value={order.payment_status || 'Unpaid'}
                      disabled={isPending}
                      onChange={(e) => handlePaymentStatusChange(order.id, e.target.value as any)}
                      className={`w-full px-2.5 py-1.5 rounded-full text-xs font-bold border focus:outline-none cursor-pointer smooth-transition ${
                        paymentStatusColors[order.payment_status || 'Unpaid'] || 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      <option value="Unpaid">Belum Bayar</option>
                      <option value="Waiting Verification">Menunggu Verifikasi</option>
                      <option value="Paid">Lunas</option>
                      <option value="Rejected">Ditolak</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider text-brand-primary/50 font-bold mb-1">Status Operasi</span>
                    <select
                      value={order.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-full text-xs font-bold border focus:outline-none cursor-pointer ${
                        statusColors[order.status] || 'bg-zinc-100 text-zinc-805'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-end w-full">
                    <button
                      onClick={() => toggleExpandOrder(order.id)}
                      className="px-4 py-2 w-full bg-brand-surface hover:bg-brand-neutral-1/10 border border-brand-neutral-1/30 rounded-full text-xs font-bold uppercase tracking-wider text-brand-primary flex items-center justify-center gap-1.5 smooth-transition cursor-pointer"
                    >
                      <span>{isExpanded ? 'Tutup Detail' : 'Buka Detail'}</span>
                      <svg
                        className={`w-3.5 h-3.5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-accent-bold' : 'text-brand-primary/50'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Mobile */}
                {isExpanded && (
                  <div className="pt-4 border-t border-brand-neutral-1/10 space-y-4 animate-slide-down text-left">
                    {/* Products details */}
                    <div>
                      <h4 className="text-xs uppercase font-bold tracking-wider text-brand-primary/50 mb-2">Detail Bouquet</h4>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex gap-2.5 items-center bg-brand-surface/20 p-2 rounded-xl border border-brand-neutral-1/10">
                            <div className="relative w-8 h-8 bg-brand-surface rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={item.products?.image_url || '/placeholder.png'}
                                alt={item.products?.name || 'Bunga'}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-grow text-xs min-w-0">
                              <div className="font-semibold text-brand-primary truncate">{item.products?.name}</div>
                              <div className="text-brand-primary/50 text-[10px]">
                                Ukuran: {item.products?.size}
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-brand-primary">
                              {item.quantity}x
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Address details */}
                    <div className="bg-brand-surface/40 p-3.5 rounded-xl border border-brand-neutral-1/10 text-xs text-brand-primary/80 space-y-1.5 text-left">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-primary/50 mb-1">Info Penerima</h4>
                      <div><span className="font-semibold">Nama:</span> {order.shipping_name}</div>
                      <div><span className="font-semibold">HP:</span> {order.shipping_phone}</div>
                      <div className="line-clamp-2"><span className="font-semibold">Alamat:</span> {order.shipping_address}</div>
                      {order.shipping_courier === 'Pending' ? (
                        <div className="pt-2 border-t border-brand-neutral-1/10 space-y-2">
                          <span className="font-semibold text-brand-primary block text-[10px] uppercase tracking-wider">Tentukan Ongkir Manual:</span>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              placeholder="Nominal Ongkir (Rp)"
                              id={`ongkir-mobile-${order.id}`}
                              className="w-full px-2.5 py-1.5 bg-white border border-brand-neutral-1/40 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`ongkir-mobile-${order.id}`) as HTMLInputElement
                                const fee = Number(input?.value)
                                if (isNaN(fee) || fee < 0) {
                                  showToast('Nominal ongkir tidak valid.', 'error')
                                  return
                                }
                                handleSetShippingFee(order.id, fee)
                              }}
                              className="px-3 py-1.5 bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white font-bold rounded-lg text-xs smooth-transition shadow-sm cursor-pointer"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {order.shipping_courier && (
                            <div>
                              <span className="font-semibold">Metode Pengiriman:</span>{' '}
                              <span className="bg-brand-accent-soft/20 text-brand-accent-bold font-bold px-1 rounded text-[9px] uppercase">
                                {order.shipping_courier.split(':')[0]}
                              </span>
                            </div>
                          )}
                          {order.shipping_fee !== undefined && order.shipping_fee > 0 && (
                            <div><span className="font-semibold">Ongkir:</span> Rp {order.shipping_fee.toLocaleString('id-ID')}</div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Receipt Verification */}
                    <div className="bg-white p-3.5 rounded-xl border border-brand-neutral-1/10 space-y-3">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-primary/50">Verifikasi & Pesan</h4>
                      <div className="flex items-center gap-2">
                        {order.payment_proof_url ? (
                          <div 
                            onClick={() => setZoomImageUrl(order.payment_proof_url)}
                            className="relative w-16 h-20 bg-brand-surface rounded-lg border border-brand-neutral-1/20 overflow-hidden cursor-pointer hover:opacity-95 shadow-sm smooth-transition flex-shrink-0"
                          >
                            <Image
                              src={order.payment_proof_url}
                              alt="Bukti Transfer"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-brand-primary/40 italic">Belum upload bukti</span>
                        )}
                        <div className="flex-grow text-xs text-brand-primary/60">
                          {order.payment_status === 'Waiting Verification' ? 'Silakan cek dan verifikasi pembayaran struk transfer.' : 'Pembayaran: ' + order.payment_status}
                        </div>
                      </div>

                      {order.payment_status === 'Waiting Verification' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleVerify(order.id, true)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider py-1.5 rounded-full smooth-transition shadow cursor-pointer"
                          >
                            Setuju (Lunas)
                          </button>
                          <button
                            onClick={() => handleVerify(order.id, false)}
                            className="bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-3 rounded-full smooth-transition shadow cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Catatan / Pesan Admin */}
                    <div className="bg-brand-surface/30 p-3.5 rounded-xl border border-brand-neutral-1/10 space-y-2">
                      <textarea
                        rows={1}
                        placeholder="Kirim catatan ke pelanggan..."
                        value={adminMessages[order.id] || ''}
                        onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-brand-neutral-1/30 rounded-lg text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => handleSendMessage(order.id)}
                        className="w-full bg-brand-primary text-white text-xs font-bold uppercase tracking-wider py-1.5 rounded-full smooth-transition cursor-pointer shadow hover:bg-brand-primary/95"
                      >
                        Kirim Pesan
                      </button>
                      {order.admin_message && (
                        <div className="bg-white p-2 rounded border border-brand-neutral-1/10 text-xs text-brand-primary/60">
                          Catatan: "{order.admin_message}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-brand-neutral-1/10 text-brand-primary/45 text-xs">
            Belum ada pesanan terdaftar.
          </div>
        )}
      </div>

      {/* Desktop Table View (Visible only on desktop) */}
      <div className="hidden lg:block w-full bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          {orders.length > 0 ? (
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
                {orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id
                  return (
                    <Fragment key={order.id}>
                      {/* Main Order Row */}
                      <tr
                        onClick={() => toggleExpandOrder(order.id)}
                        className={`hover:bg-brand-surface/20 smooth-transition cursor-pointer ${
                          isExpanded ? 'bg-brand-surface/30' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-brand-primary/40">
                          <svg
                            className={`w-4 h-4 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-accent-bold' : 'text-brand-primary/40'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                          </svg>
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
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans animate-slide-down">
                              {/* Left: Products items (col-span-5) */}
                              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-brand-neutral-1/15 shadow-sm hover:shadow smooth-transition">
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
                                      <div className="flex-grow text-xs min-w-0">
                                        <div className="font-semibold text-brand-primary truncate">{item.products?.name}</div>
                                        <div className="text-brand-primary/60">
                                          Ukuran: {item.products?.size || '-'}
                                        </div>
                                      </div>
                                      <div className="text-xs text-right text-brand-primary font-semibold font-sans whitespace-nowrap flex-shrink-0">
                                        {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Middle: Shipping details (col-span-3) */}
                              <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-brand-neutral-1/15 shadow-sm hover:shadow smooth-transition">
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
                                  {order.shipping_courier === 'Pending' ? (
                                    <div className="pt-2 border-t border-brand-neutral-1/10 space-y-2">
                                      <span className="font-semibold text-brand-primary block text-[10px] uppercase tracking-wider">Tentukan Ongkir Manual:</span>
                                      <div className="flex gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Nominal Ongkir (Rp)"
                                          id={`ongkir-${order.id}`}
                                          className="w-full px-2.5 py-1.5 bg-brand-surface border border-brand-neutral-1/40 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent-bold"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById(`ongkir-${order.id}`) as HTMLInputElement
                                            const fee = Number(input?.value)
                                            if (isNaN(fee) || fee < 0) {
                                              showToast('Nominal ongkir tidak valid.', 'error')
                                              return
                                            }
                                            handleSetShippingFee(order.id, fee)
                                          }}
                                          className="px-3 py-1.5 bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white font-bold rounded-lg text-xs smooth-transition shadow-sm cursor-pointer"
                                        >
                                          Set
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {order.shipping_courier && (
                                        <div>
                                          <span className="font-semibold text-brand-primary">Metode Pengiriman:</span>{' '}
                                          <span className="bg-brand-accent-soft/20 text-brand-accent-bold font-bold px-1.5 py-0.5 rounded text-[9px] uppercase font-sans">
                                            {order.shipping_courier.split(':')[0]}
                                          </span>
                                        </div>
                                      )}
                                      {order.shipping_fee !== undefined && order.shipping_fee > 0 && (
                                        <div>
                                          <span className="font-semibold text-brand-primary">Ongkos Kirim:</span>{' '}
                                          Rp {Number(order.shipping_fee).toLocaleString('id-ID')}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Right: Payment verification & Admin Message (col-span-4) */}
                              <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-brand-neutral-1/15 shadow-sm hover:shadow smooth-transition space-y-4">
                                <h4 className="font-serif text-sm font-bold text-brand-primary mb-1 uppercase tracking-wider">Verifikasi Pembayaran</h4>
                                <div className="text-xs text-brand-primary/80 space-y-2.5 leading-relaxed bg-brand-surface/40 p-4 rounded-xl border border-brand-neutral-1/10 flex flex-col">
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
                                  <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-neutral-1/10 space-y-3 animate-fade-in">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-primary block">Aksi Verifikasi</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleVerify(order.id, true)}
                                        className="flex-grow bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-full smooth-transition cursor-pointer shadow"
                                      >
                                        Setujui (Lunas)
                                      </button>
                                      <button
                                        onClick={() => handleVerify(order.id, false)}
                                        className="bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded-full smooth-transition cursor-pointer shadow"
                                      >
                                        Tolak
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Admin Message Form */}
                                <div className="bg-brand-surface/40 p-4 rounded-xl border border-brand-neutral-1/10 space-y-2.5">
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
                    </Fragment>
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

      {/* Custom Modal for Verification & Status Input */}
      {modalState.isOpen && mounted && (() => {
        const isApprove = modalState.actionType === 'verify_approve' || modalState.actionType === 'status_change_paid'
        const getSuggestions = () => {
          if (modalState.actionType?.includes('reject')) {
            return [
              'Struk transfer tidak terbaca',
              'Nominal transfer kurang',
              'Struk transfer palsu / berbeda',
              'Rekening tujuan salah'
            ]
          } else {
            return [
              '2 Hari Kerja',
              '3 Hari Kerja',
              '1 Hari Kerja',
              'Selesai Hari Ini'
            ]
          }
        }
        const isSubmitDisabled = !isApprove && !modalState.value.trim()

        return createPortal(
          <div className="fixed inset-0 bg-brand-primary/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div 
              className="bg-white rounded-[28px] border border-brand-neutral-1/15 shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-all duration-300 animate-slide-down"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-brand-surface border-b border-brand-neutral-1/10 px-6 py-4 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/50">
                  Aksi Admin
                </span>
                <button
                  onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  className="text-brand-primary/45 hover:text-brand-accent-bold smooth-transition cursor-pointer p-1 rounded-full hover:bg-brand-surface-dim/20"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 text-center">
                {/* SVG Icon with smooth animation */}
                {isApprove ? (
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-50 border border-green-200/50 flex items-center justify-center text-green-600 shadow-sm transition-all duration-300 hover:scale-105">
                    <svg className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(22,163,74,0.15)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="mx-auto w-14 h-14 rounded-full bg-red-50 border border-red-200/50 flex items-center justify-center text-brand-accent-bold shadow-sm transition-all duration-300 hover:scale-105">
                    <svg className="w-7 h-7 filter drop-shadow-[0_2px_4px_rgba(158,59,59,0.15)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}

                <div className="space-y-1">
                  <h4 className="font-serif text-base font-bold text-brand-primary">
                    {modalState.title}
                  </h4>
                  <p className="text-[11px] text-brand-primary/60 max-w-xs mx-auto font-sans leading-relaxed">
                    {isApprove 
                      ? 'Tentukan perkiraan waktu pengerjaan buket bunga pesanan ini untuk diinformasikan langsung kepada pelanggan.' 
                      : 'Masukkan alasan yang jelas agar pelanggan mengerti mengapa pembayaran mereka ditolak.'}
                  </p>
                </div>

                {/* Textarea */}
                <div className="space-y-2 text-left pt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary/60">
                    {isApprove ? 'Perkiraan Waktu Pengerjaan:' : 'Alasan Penolakan (Wajib):'}
                  </label>
                  <textarea
                    rows={3}
                    required={!isApprove}
                    placeholder={modalState.placeholder}
                    value={modalState.value}
                    onChange={(e) => setModalState((prev) => ({ ...prev, value: e.target.value }))}
                    className={`w-full px-4 py-3 bg-brand-surface border rounded-2xl text-xs focus:outline-none focus:ring-2 text-brand-primary resize-none placeholder-brand-primary/35 font-sans smooth-transition ${
                      !isApprove && !modalState.value.trim() 
                        ? 'border-brand-accent-bold/30 focus:border-brand-accent-bold focus:ring-brand-accent-soft/20'
                        : 'border-brand-neutral-1/40 focus:border-brand-primary focus:ring-brand-neutral-1/30'
                    }`}
                  />
                </div>

                {/* Suggestions pills */}
                <div className="space-y-2 text-left">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-primary/50">Saran Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {getSuggestions().map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setModalState((prev) => ({ ...prev, value: suggestion }))}
                        className="px-3 py-1.5 bg-brand-surface hover:bg-brand-accent-soft/20 border border-brand-neutral-1/30 hover:border-brand-accent-soft rounded-full text-[10px] text-brand-primary font-medium smooth-transition cursor-pointer active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-brand-surface px-6 py-4 border-t border-brand-neutral-1/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-white hover:bg-brand-surface border border-brand-neutral-1/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary smooth-transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={isSubmitDisabled}
                  className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider smooth-transition shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5 ${
                    isSubmitDisabled
                      ? 'bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed shadow-none'
                      : isApprove
                        ? 'bg-green-600 hover:bg-green-750 text-white active:scale-95 shadow-green-600/10'
                        : 'bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white active:scale-95 shadow-brand-accent-bold/10'
                  }`}
                >
                  {isApprove ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Setujui
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Tolak
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}
    </div>
  )
}
