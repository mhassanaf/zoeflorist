'use client'

import { useState, useTransition, useEffect } from 'react'
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
      <div className="p-2.5 sm:p-4 md:p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-serif text-xs xs:text-sm sm:text-base md:text-base lg:text-lg font-semibold text-brand-primary tracking-tight mb-0.5 sm:mb-1 line-clamp-1 group-hover:text-brand-accent-bold smooth-transition">
            {product.name}
          </h3>

          {/* Ratings Display */}
          <div className="flex items-center gap-1 mb-1.5">
            <svg className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {product.review_count && product.review_count > 0 ? (
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-[9px] xs:text-[10px] sm:text-xs font-bold text-brand-primary">{product.avg_rating}</span>
                <span className="text-[7px] xs:text-[8px] sm:text-[10px] text-brand-primary/50 font-sans">({product.review_count})</span>
              </div>
            ) : (
              <span className="text-[7px] xs:text-[8px] sm:text-[10px] text-brand-primary/45 font-sans">Belum diulas</span>
            )}
          </div>

          <p className="text-[9px] xs:text-[10px] sm:text-xs text-brand-primary/60 font-sans line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-4 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div>
          {/* Price and Stock */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-2 sm:mb-4 gap-0.5 sm:gap-0">
            <span className="font-serif text-xs xs:text-sm sm:text-base md:text-base lg:text-lg font-bold text-brand-accent-bold">
              Rp {product.price.toLocaleString('id-ID')}
            </span>
            <span className={`text-[8px] xs:text-[9px] sm:text-[11px] font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-brand-accent-bold'}`}>
              {product.stock > 0 ? `Stok: ${product.stock}` : 'Habis'}
            </span>
          </div>

          {/* Add to Cart or Quantity Selector */}
          {quantityInCart === 0 ? (
            product.stock <= 0 ? (
              <button
                disabled
                className="w-full bg-brand-surface text-brand-primary/30 border border-brand-neutral-1/30 py-1.5 sm:py-2.5 rounded-full text-[9px] sm:text-xs font-semibold uppercase tracking-wider text-center cursor-not-allowed"
              >
                Stok Kosong
              </button>
            ) : (
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-1.5 xl:gap-2">
                {/* Local Quantity Selector */}
                <div className="flex items-center justify-between border border-brand-neutral-1/30 rounded-full bg-brand-surface p-0.5 w-full xl:w-auto">
                  <button
                    onClick={handleLocalDecrement}
                    className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-xs sm:text-sm"
                  >
                    &minus;
                  </button>
                  <span className="px-1.5 sm:px-2 font-sans font-bold text-xs text-brand-primary">{localQty}</span>
                  <button
                    onClick={handleLocalIncrement}
                    disabled={localQty >= product.stock}
                    className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition disabled:opacity-40 cursor-pointer text-xs sm:text-sm"
                  >
                    &#43;
                  </button>
                </div>
                {/* Add Button */}
                <button
                  onClick={handleAddToCartClick}
                  className="flex-grow bg-brand-primary hover:bg-brand-primary/95 text-white py-1.5 sm:py-2.5 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider smooth-transition focus:outline-none cursor-pointer hover:scale-[1.02] text-center"
                >
                  Tambah
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between border border-brand-accent-soft text-brand-primary bg-brand-surface py-0.5 sm:py-1.5 px-2.5 sm:px-4 rounded-full smooth-transition">
              <button
                onClick={handleQuantityDecrement}
                className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition cursor-pointer text-xs sm:text-sm"
              >
                &minus;
              </button>
              <span className="font-sans font-bold text-xs sm:text-sm text-brand-primary">{quantityInCart}</span>
              <button
                onClick={handleQuantityIncrement}
                disabled={quantityInCart >= product.stock}
                className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-brand-primary hover:text-brand-accent-bold hover:bg-brand-neutral-1/10 smooth-transition disabled:opacity-40 cursor-pointer text-xs sm:text-sm"
              >
                &#43;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
