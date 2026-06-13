'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createOrder } from '@/app/actions/orders'
import { useToast } from '@/components/Toast'

interface CartItem {
  id: string
  name: string
  price: number
  image_url: string
  quantity: number
  maxStock: number
}

interface CheckoutClientProps {
  isLoggedIn: boolean
}

export default function CheckoutClient({ isLoggedIn }: CheckoutClientProps) {
  const router = useRouter()
  const { showToast, dismissToast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Shipping form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Load cart from localStorage upon component mounting
  useEffect(() => {
    setMounted(true)
    const storedCart = localStorage.getItem('zoeflorist_cart')
    if (storedCart) {
      setCart(JSON.parse(storedCart))
    }
  }, [])

  const updateCartInStateAndStorage = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('zoeflorist_cart', JSON.stringify(newCart))
    window.dispatchEvent(new Event('cart-updated'))
  }

  const handleQuantityChange = (index: number, delta: number) => {
    const newCart = [...cart]
    const item = newCart[index]
    const nextQty = item.quantity + delta
    
    if (nextQty <= 0) {
      // Remove item
      newCart.splice(index, 1)
    } else {
      if (nextQty > item.maxStock) {
        showToast(`Batas stok tercapai. Tersedia: ${item.maxStock}`, 'error')
        return
      }
      item.quantity = nextQty
    }
    updateCartInStateAndStorage(newCart)
  }

  const handleRemove = (index: number) => {
    const newCart = [...cart]
    newCart.splice(index, 1)
    updateCartInStateAndStorage(newCart)
  }

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk melakukan pesanan.')
      return
    }

    if (cart.length === 0) {
      setErrorMsg('Keranjang belanja Anda kosong.')
      return
    }

    if (!name.trim()) {
      setErrorMsg('Silakan masukkan nama penerima.')
      showToast('Silakan masukkan nama penerima.', 'error')
      return
    }

    if (!phone.trim()) {
      setErrorMsg('Silakan masukkan nomor WhatsApp.')
      showToast('Silakan masukkan nomor WhatsApp.', 'error')
      return
    }

    if (!address.trim()) {
      setErrorMsg('Silakan masukkan alamat lengkap pengiriman.')
      showToast('Silakan masukkan alamat lengkap pengiriman.', 'error')
      return
    }

    startTransition(async () => {
      const toastId = showToast('Memproses pesanan Anda...', 'loading')
      
      const shippingDetails = {
        shipping_name: name.trim(),
        shipping_phone: phone.trim(),
        shipping_address: address.trim(),
        payment_method: paymentMethod,
      }

      const orderItems = cart.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      }))

      const result = await createOrder(shippingDetails, orderItems)

      dismissToast(toastId)

      if (result.error) {
        setErrorMsg(result.error)
        showToast(result.error, 'error')
      } else {
        setSuccessMsg('Pesanan berhasil dibuat! Keranjang belanja dikosongkan.')
        showToast('Pesanan berhasil dibuat! Keranjang belanja dikosongkan.', 'success')
        // Clear cart
        updateCartInStateAndStorage([])
        setTimeout(() => {
          router.push('/riwayat')
        }, 1500)
      }
    })
  }

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="w-10 h-10 border-4 border-brand-accent-soft/30 border-t-brand-accent-bold rounded-full animate-spin"></div>
        <p className="text-sm text-brand-primary/60 font-sans font-medium">
          Mempersiapkan laman checkout Anda...
        </p>
      </div>
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in-up">
        <svg className="w-16 h-16 text-brand-neutral-3/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h2 className="font-serif text-2xl font-bold text-brand-primary">Keranjang Belanja Kosong</h2>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Anda belum menambahkan buket bunga apapun ke dalam keranjang.
        </p>
        <div className="mt-6">
          <Link
            href="/katalog"
            className="inline-block bg-brand-primary hover:bg-brand-primary/95 text-white text-sm font-semibold py-3 px-8 rounded-full smooth-transition"
          >
            Mulai Belanja Bunga
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 sm:pt-28 md:py-10 animate-fade-in-up">
      {/* Back Button */}
      <div className="mb-6 flex justify-start">
        <Link
          href="/keranjang"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Keranjang
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-brand-primary">Selesaikan Pesanan Anda</h1>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Isi detail alamat pemesanan untuk proses pengantaran buket bunga Anda.
        </p>
      </div>

      {!isLoggedIn && (
        <div className="mb-8 p-4 bg-brand-accent-bold/5 border border-brand-accent-bold/10 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-brand-primary/80 font-sans">
            Anda belum masuk log. Silakan login terlebih dahulu untuk menyelesaikan transaksi ini.
          </p>
          <Link
            href="/login?error=Silakan login terlebih dahulu untuk melakukan pesanan."
            className="bg-brand-accent-bold text-white text-xs font-semibold px-6 py-2.5 rounded-full smooth-transition"
          >
            Login Sekarang
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="mb-8 bg-brand-accent-bold/10 border border-brand-accent-bold/30 text-brand-accent-bold px-4 py-3 rounded-lg text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-8 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Alamat Kirim (Kiri) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-brand-neutral-1/10 shadow-sm h-fit">
          <h2 className="font-serif text-xl font-bold text-brand-primary mb-6">Detail Pemesanan</h2>
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            <div>
              <label htmlFor="shipping_name" className="block text-sm font-medium text-brand-primary">
                Nama Pemesan / Penerima Bunga
              </label>
              <input
                id="shipping_name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isLoggedIn || isPending}
                className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-soft disabled:opacity-50"
                placeholder="cth: Siti Rahma"
              />
            </div>

            <div>
              <label htmlFor="shipping_phone" className="block text-sm font-medium text-brand-primary">
                Nomor WhatsApp Penerima
              </label>
              <input
                id="shipping_phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isLoggedIn || isPending}
                className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-soft disabled:opacity-50"
                placeholder="cth: 081234567890"
              />
            </div>

            {/* Nama Jalan & Detail Alamat */}
            <div>
              <label htmlFor="shipping_address" className="block text-sm font-medium text-brand-primary">
                Alamat Lengkap Pengiriman (Tulis detail RT/RW, Kecamatan, Kota, & Provinsi)
              </label>
              <textarea
                id="shipping_address"
                required
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isLoggedIn || isPending}
                className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent-soft disabled:opacity-50"
                placeholder="cth: Jl. Kembang Indah Raya No. 12, Gg. Melati, RT 02/RW 04, Kec. Cibiru, Kota Bandung, Jawa Barat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-primary mb-3">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['Bank Transfer', 'QRIS', 'E-wallet'].map((method) => (
                  <label
                    key={method}
                    className={`flex items-center justify-center py-3.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer smooth-transition ${
                      paymentMethod === method
                        ? 'border-brand-accent-bold bg-brand-accent-soft/10 text-brand-accent-bold'
                        : 'border-brand-neutral-1/40 text-brand-primary hover:bg-brand-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      disabled={!isLoggedIn || isPending}
                      className="sr-only"
                    />
                    {method === 'Bank Transfer' && 'Transfer BCA'}
                    {method === 'QRIS' && 'QRIS'}
                    {method === 'E-wallet' && 'E-Wallet (Dana/GoPay)'}
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!isLoggedIn || isPending}
                className="w-full bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white font-semibold py-3.5 px-6 rounded-full text-sm shadow-md hover:shadow-lg smooth-transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? 'Sedang Memproses...' : 'Buat Pesanan Sekarang'}
              </button>
            </div>
          </form>
        </div>

        {/* Ringkasan Belanja (Kanan) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-brand-neutral-1/10 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-brand-primary mb-6">Ringkasan Belanja</h2>
            
            {/* List Cart Items */}
            <div className="divide-y divide-brand-neutral-1/10 max-h-[400px] overflow-y-auto pr-2">
              {cart.map((item, index) => (
                <div key={item.id} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                  <div className="relative w-16 h-16 bg-brand-surface rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-brand-primary line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-brand-accent-bold font-bold mt-0.5">
                        Rp {item.price.toLocaleString('id-ID')}
                      </p>
                    </div>
                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-brand-neutral-1/30 rounded-full bg-brand-surface px-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, -1)}
                          disabled={isPending}
                          className="px-2 py-0.5 text-brand-primary hover:text-brand-accent-bold text-sm disabled:opacity-50 cursor-pointer"
                        >
                          &minus;
                        </button>
                        <span className="px-2 text-xs font-semibold text-brand-primary font-sans">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, 1)}
                          disabled={isPending}
                          className="px-2 py-0.5 text-brand-primary hover:text-brand-accent-bold text-sm disabled:opacity-50 cursor-pointer"
                        >
                          &#43;
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        disabled={isPending}
                        className="text-xs text-brand-primary/50 hover:text-brand-accent-bold smooth-transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-neutral-1/10 mt-6 pt-6 space-y-3">
              <div className="flex justify-between text-sm text-brand-primary/80 font-sans">
                <span>Subtotal</span>
                <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-brand-primary/80 font-sans">
                <span>Ongkos Kirim</span>
                <span className="text-brand-primary/60 italic">
                  Menunggu penentuan admin
                </span>
              </div>
              <div className="border-t border-brand-neutral-1/10 pt-3 flex justify-between items-baseline font-serif text-lg font-bold text-brand-primary">
                <span>Total Pembayaran</span>
                <span className="text-brand-accent-bold">Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-[10px] text-brand-primary/45 font-sans leading-relaxed text-right mt-1">
                *Belum termasuk biaya pengiriman (jika dikirim). Biaya ongkir akan diinput oleh admin setelah meninjau pesanan Anda.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
