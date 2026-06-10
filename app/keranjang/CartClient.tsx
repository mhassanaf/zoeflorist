'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface CartItem {
  id: string
  name: string
  price: number
  image_url: string
  quantity: number
  maxStock: number
}

export default function CartClient() {
  const router = useRouter()
  const { showToast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load cart from localStorage upon mount
  useEffect(() => {
    setMounted(true)
    const storedCart = localStorage.getItem('zoeflorist_cart')
    if (storedCart) {
      setCart(JSON.parse(storedCart))
    }
  }, [])

  const updateCart = (newCart: CartItem[]) => {
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
    updateCart(newCart)
  }

  const handleRemoveItem = (index: number) => {
    const item = cart[index]
    const newCart = [...cart]
    newCart.splice(index, 1)
    updateCart(newCart)
    showToast(`"${item.name}" dihapus dari keranjang.`, 'success')
  }

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="w-10 h-10 border-4 border-brand-accent-soft/30 border-t-brand-accent-bold rounded-full animate-spin"></div>
        <p className="text-sm text-brand-primary/60 font-sans font-medium">
          Memuat keranjang belanja Anda...
        </p>
      </div>
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in-up flex-1 flex flex-col justify-center">
        <svg className="w-16 h-16 text-brand-neutral-3/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h2 className="font-serif text-2xl font-bold text-brand-primary">Keranjang Belanja Kosong</h2>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Silakan pilih bouquet bunga segar di katalog kami untuk dimasukkan ke keranjang.
        </p>
        <div className="mt-6">
          <Link
            href="/katalog"
            className="inline-block bg-brand-primary hover:bg-brand-primary/95 text-white text-sm font-semibold py-3 px-8 rounded-full smooth-transition shadow-sm"
          >
            Jelajahi Katalog Bunga
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 sm:pt-28 md:py-10 animate-fade-in-up flex-1">
      {/* Back Button */}
      <div className="mb-6 flex justify-start">
        <Link
          href="/katalog"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Katalog
        </Link>
      </div>

      <div className="mb-10 text-center md:text-left">
        <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Daftar Belanja</span>
        <h1 className="font-serif text-3xl font-bold text-brand-primary mt-1">Keranjang Belanja Anda</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Items List (Left Column) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="divide-y divide-brand-neutral-1/10">
              {cart.map((item, index) => (
                <div key={item.id} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                  <div className="flex gap-4 items-center">
                    {/* Item Image */}
                    <div className="relative w-20 h-20 bg-brand-surface rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Item Info */}
                    <div>
                      <h3 className="font-serif text-base font-semibold text-brand-primary line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-brand-accent-bold font-bold mt-1">
                        Rp {item.price.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls & Total & Remove */}
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-6 sm:gap-10">
                    {/* Quantity selectors */}
                    <div className="flex items-center border border-brand-neutral-1/30 rounded-full bg-brand-surface px-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, -1)}
                        className="w-8 h-8 flex items-center justify-center text-brand-primary hover:text-brand-accent-bold text-sm smooth-transition cursor-pointer"
                      >
                        &minus;
                      </button>
                      <span className="px-3 text-xs font-bold text-brand-primary font-sans">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, 1)}
                        className="w-8 h-8 flex items-center justify-center text-brand-primary hover:text-brand-accent-bold text-sm smooth-transition cursor-pointer"
                      >
                        &#43;
                      </button>
                    </div>

                    {/* Total Price */}
                    <div className="text-right">
                      <span className="block text-[9px] uppercase tracking-wider text-brand-primary/50 font-semibold font-sans">Total</span>
                      <span className="font-sans font-bold text-sm text-brand-primary">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-brand-primary/40 hover:text-brand-accent-bold p-1 smooth-transition cursor-pointer"
                      title="Hapus barang"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-left">
            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary/70 hover:text-brand-accent-bold smooth-transition"
            >
              &larr; Lanjut Belanja Bunga
            </Link>
          </div>
        </div>

        {/* Order Summary (Right Column) */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-brand-neutral-1/10 shadow-sm space-y-6">
            <h2 className="font-serif text-xl font-bold text-brand-primary">Ringkasan Belanja</h2>

            <div className="divide-y divide-brand-neutral-1/10 space-y-4">
              <div className="flex justify-between text-sm text-brand-primary/80 font-sans pt-2">
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)</span>
                <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-brand-primary/80 font-sans pt-4">
                <span>Ongkos Kirim</span>
                <span className="text-green-600 font-semibold">Gratis</span>
              </div>
              <div className="flex justify-between items-baseline font-serif text-lg font-bold text-brand-primary pt-4">
                <span>Total Belanja</span>
                <span className="text-brand-accent-bold">Rp {cartTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/checkout"
                className="block w-full bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white text-center py-3.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg smooth-transition"
              >
                Lanjut ke Pembayaran
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
