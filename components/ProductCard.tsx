'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toggleFavorite } from '@/app/actions/favorites'
import { useToast } from '@/components/Toast'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  size: 'Kecil' | 'Sedang' | 'Besar'
  color: string
  stock: number
  is_active: boolean
  avg_rating?: number
  review_count?: number
}

interface ProductCardProps {
  product: Product
  initialIsFavorite: boolean
  isLoggedIn: boolean
}

export default function ProductCard({ product, initialIsFavorite, isLoggedIn }: ProductCardProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isPending, startTransition] = useTransition()
  const [quantityInCart, setQuantityInCart] = useState(0)
  const [localQty, setLocalQty] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [isOpenDetail, setIsOpenDetail] = useState(false)

  const handleLocalIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    if (localQty >= product.stock) {
      showToast(`Batas stok tercapai. Tersedia: ${product.stock}`, 'error')
      return
    }

    setLocalQty((prev) => prev + 1)
  }

  const handleLocalDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    if (localQty > 1) {
      setLocalQty((prev) => prev - 1)
    }
  }

  // Load cart status on mount to find existing quantity
  useEffect(() => {
    setMounted(true)
    const checkCartQuantity = () => {
      const storedCart = localStorage.getItem('zoeflorist_cart')
      if (storedCart) {
        const cart = JSON.parse(storedCart)
        const cartItem = cart.find((item: any) => item.id === product.id)
        if (cartItem) {
          setQuantityInCart(cartItem.quantity)
        } else {
          setQuantityInCart(0)
          setLocalQty(1) // Reset local qty counter
        }
      } else {
        setQuantityInCart(0)
        setLocalQty(1) // Reset local qty counter
      }
    }

    checkCartQuantity()

    // Listen to changes made in other parts of the site (cart page / header)
    window.addEventListener('cart-updated', checkCartQuantity)
    return () => {
      window.removeEventListener('cart-updated', checkCartQuantity)
    }
  }, [product.id])

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk menyimpan favorit.')
      return
    }

    startTransition(async () => {
      const res = await toggleFavorite(product.id)
      if (res.success) {
        setIsFavorite(res.favorited ?? false)
        showToast(res.favorited ? 'Berhasil ditambahkan ke favorit!' : 'Berhasil dihapus dari favorit.', 'success')
      } else if (res.error) {
        showToast(res.error, 'error')
      }
    })
  }

  const updateCartQuantity = (newQty: number) => {
    const storedCart = localStorage.getItem('zoeflorist_cart')
    let cart = storedCart ? JSON.parse(storedCart) : []
    const existingIndex = cart.findIndex((item: any) => item.id === product.id)

    if (newQty <= 0) {
      // Remove item
      if (existingIndex > -1) {
        cart.splice(existingIndex, 1)
      }
      setQuantityInCart(0)
    } else {
      if (existingIndex > -1) {
        cart[existingIndex].quantity = newQty
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          quantity: newQty,
          maxStock: product.stock
        })
      }
      setQuantityInCart(newQty)
    }

    localStorage.setItem('zoeflorist_cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cart-updated'))
  }

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    if (product.stock <= 0) {
      showToast('Stok bunga ini sedang kosong.', 'error')
      return
    }

    updateCartQuantity(localQty)
    showToast(`"${product.name}" (${localQty} item) berhasil ditambahkan ke keranjang!`, 'success')
  }

  const handleBuyNow = (e: React.MouseEvent, customQty?: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    if (product.stock <= 0) {
      showToast('Stok bunga ini sedang kosong.', 'error')
      return
    }

    const targetQty = customQty ?? (quantityInCart > 0 ? quantityInCart : 1)
    updateCartQuantity(targetQty)
    showToast(`Menuju ke checkout...`, 'success')

    setTimeout(() => {
      router.push('/checkout')
    }, 120)
  }

  const handleQuantityIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    if (quantityInCart >= product.stock) {
      showToast(`Batas stok tercapai. Tersedia: ${product.stock}`, 'error')
      return
    }

    updateCartQuantity(quantityInCart + 1)
  }

  const handleQuantityDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
      return
    }

    updateCartQuantity(quantityInCart - 1)
  }

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-brand-neutral-1/10 hover:border-brand-accent-soft/30 hover:shadow-xl hover:-translate-y-1.5 smooth-transition flex flex-col h-full">
      {/* Image container */}
      <div className="relative aspect-square w-full bg-brand-surface overflow-hidden">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavoriteClick}
          disabled={isPending}
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 rounded-full bg-white/80 backdrop-blur hover:bg-white text-brand-primary hover:text-brand-accent-bold shadow-sm hover:shadow smooth-transition z-10 cursor-pointer hover:scale-[1.08]"
        >
          <svg
            className={`w-5 h-5 ${isFavorite ? 'fill-brand-accent-bold text-brand-accent-bold' : 'text-brand-primary/60'}`}
            fill={isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Size Badge */}
        <span className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 bg-brand-primary/80 backdrop-blur text-brand-surface text-[8px] sm:text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
          {product.size}
        </span>
      </div>

      {/* Info container */}
      <div className="p-2 xs:p-2.5 sm:p-3 md:p-3.5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-serif text-[11px] xs:text-xs sm:text-sm md:text-sm lg:text-base font-semibold text-brand-primary tracking-tight mb-0.5 sm:mb-1 line-clamp-1 group-hover:text-brand-accent-bold smooth-transition">
            {product.name}
          </h3>

          {/* Ratings Display */}
          <div className="flex items-center gap-1 mb-1">
            <svg className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-amber-500 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-bold text-brand-primary">
                {Number(product.avg_rating ?? 0).toFixed(1)}
              </span>
              <span className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] text-brand-primary/50 font-sans">
                ({product.review_count ?? 0})
              </span>
            </div>
          </div>

          <p className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs text-brand-primary/60 font-sans line-clamp-1 mb-1.5 sm:mb-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div>
          {/* Price and Stock */}
          <div className="flex items-baseline justify-between mb-2 sm:mb-2.5 gap-1">
            <span className="font-serif text-[10px] xs:text-xs sm:text-sm md:text-sm lg:text-base font-bold text-brand-accent-bold whitespace-nowrap">
              Rp {product.price.toLocaleString('id-ID')}
            </span>
            <span className={`text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-semibold whitespace-nowrap ${product.stock > 0 ? 'text-green-600' : 'text-brand-accent-bold'}`}>
              {product.stock > 0 ? `Stok: ${product.stock}` : 'Habis'}
            </span>
          </div>

          {/* Action Button Container */}
          {product.stock <= 0 ? (
            <button
              disabled
              className="w-full bg-brand-surface text-brand-primary/30 border border-brand-neutral-1/20 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center cursor-not-allowed"
            >
              Stok Habis
            </button>
          ) : (
            <div className="flex gap-1.5 w-full">
              {/* Details Modal Trigger Button */}
              <button
                onClick={() => setIsOpenDetail(true)}
                className="flex-1 border border-brand-primary hover:bg-brand-primary/5 text-brand-primary py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer flex items-center justify-center gap-0.5"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="leading-none mt-[0.5px]">Detail</span>
              </button>
              {/* Buy Now Button */}
              <button
                onClick={(e) => handleBuyNow(e)}
                className="flex-1 bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer flex items-center justify-center gap-1 shadow-sm hover:scale-[1.02]"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="leading-none mt-[0.5px]">Beli</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal Overlay */}
      {isOpenDetail && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-brand-primary/45 backdrop-blur-md z-[9999] animate-fade-in cursor-pointer"
            onClick={() => setIsOpenDetail(false)}
          />
          {/* Modal Content container */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-brand-neutral-1/20 shadow-2xl overflow-y-auto max-h-[90vh] animate-fade-in-up flex flex-col relative">
              {/* Close Button */}
              <button
                onClick={() => setIsOpenDetail(false)}
                className="absolute top-4 right-4 text-brand-primary/50 hover:text-brand-accent-bold text-2xl font-bold focus:outline-none cursor-pointer z-10 w-8 h-8 flex items-center justify-center rounded-full bg-brand-surface/85 smooth-transition shadow-sm"
              >
                &times;
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Left: Product Image */}
                <div className="relative aspect-square w-full bg-brand-surface rounded-2xl overflow-hidden border border-brand-neutral-1/10 shadow-inner">
                  <Image
                    src={product.image_url || '/placeholder.png'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                  {/* Size Badge */}
                  <span className="absolute bottom-3.5 left-3.5 bg-brand-primary/80 backdrop-blur text-brand-surface text-[9px] uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full">
                    {product.size}
                  </span>
                </div>

                {/* Right: Info details */}
                <div className="flex flex-col h-full justify-between space-y-4 text-left">
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-brand-primary tracking-tight">
                      {product.name}
                    </h2>

                    {/* Ratings */}
                    <div className="flex items-center gap-1 mt-1 mb-3">
                      <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-brand-primary">
                          {Number(product.avg_rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-brand-primary/50 font-sans">
                          ({product.review_count ?? 0} ulasan)
                        </span>
                      </div>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex justify-between items-baseline bg-brand-surface/40 px-3 py-2 rounded-xl border border-brand-neutral-1/10 mb-3.5">
                      <span className="font-serif text-base font-bold text-brand-accent-bold">
                        Rp {product.price.toLocaleString('id-ID')}
                      </span>
                      <span className={`text-[10px] font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-brand-accent-bold'}`}>
                        {product.stock > 0 ? `Tersedia: ${product.stock} stok` : 'Stok Habis'}
                      </span>
                    </div>

                    <h3 className="text-[10px] uppercase tracking-wider text-brand-primary/60 font-bold mb-1">Deskripsi Bunga</h3>
                    <p className="text-xs text-brand-primary/80 font-sans leading-relaxed whitespace-pre-line max-h-[120px] overflow-y-auto pr-1">
                      {product.description}
                    </p>
                  </div>

                  {/* Add to Cart Actions */}
                  <div className="pt-3 border-t border-brand-neutral-1/10 space-y-2.5">
                    {quantityInCart === 0 ? (
                      product.stock <= 0 ? (
                        <button
                          disabled
                          className="w-full bg-brand-surface text-brand-primary/30 border border-brand-neutral-1/30 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-center cursor-not-allowed"
                        >
                          Stok Sedang Kosong
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center">
                            {/* Local Quantity Selector */}
                            <div className="flex items-center justify-between border border-brand-neutral-1/30 rounded-full bg-brand-surface p-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (localQty > 1) setLocalQty(prev => prev - 1)
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-sm"
                              >
                                &minus;
                              </button>
                              <span className="px-2 font-sans font-bold text-xs text-brand-primary">{localQty}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (localQty < product.stock) setLocalQty(prev => prev + 1)
                                  else showToast(`Batas stok tercapai. Tersedia: ${product.stock}`, 'error')
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-sm"
                              >
                                &#43;
                              </button>
                            </div>
                            {/* Add Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                if (!isLoggedIn) {
                                  router.push('/login?error=Silakan login terlebih dahulu untuk mulai berbelanja.')
                                  return
                                }
                                updateCartQuantity(localQty)
                                showToast(`"${product.name}" (${localQty} item) berhasil ditambahkan ke keranjang!`, 'success')
                              }}
                              className="flex-grow bg-brand-primary/10 hover:bg-brand-primary/15 text-brand-primary border border-brand-primary/20 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer text-center"
                            >
                              Tambah ke Keranjang
                            </button>
                          </div>

                          {/* Buy Now Direct Button */}
                          <button
                            type="button"
                            onClick={(e) => handleBuyNow(e, localQty)}
                            className="w-full bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white py-2.5 rounded-full text-xs font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer hover:scale-[1.02] text-center flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            Beli Sekarang (Langsung Checkout)
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1 text-center">
                          <span className="block text-[9px] uppercase tracking-wider text-brand-primary/60 font-bold">Jumlah di Keranjang Belanja</span>
                          <div className="flex items-center justify-between border border-brand-accent-soft text-brand-primary bg-brand-surface py-1 px-3 rounded-full smooth-transition max-w-[150px] mx-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                updateCartQuantity(quantityInCart - 1)
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-xs"
                            >
                              &minus;
                            </button>
                            <span className="font-sans font-bold text-xs text-brand-primary">{quantityInCart}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                if (quantityInCart < product.stock) {
                                  updateCartQuantity(quantityInCart + 1)
                                } else {
                                  showToast(`Batas stok tercapai. Tersedia: ${product.stock}`, 'error')
                                }
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-xs"
                            >
                              &#43;
                            </button>
                          </div>
                        </div>

                        {/* Buy Now Direct Button when quantity > 0 */}
                        <button
                          type="button"
                          onClick={(e) => handleBuyNow(e, quantityInCart)}
                          className="w-full bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white py-2.5 rounded-full text-xs font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer hover:scale-[1.02] text-center flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          Beli Sekarang (Langsung Checkout)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
