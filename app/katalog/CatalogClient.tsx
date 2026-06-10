'use client'

import { useState } from 'react'
import ProductCard from '@/components/ProductCard'

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
  created_at: string
}

interface CatalogClientProps {
  initialProducts: Product[]
  favoritesMap: Record<string, boolean>
  isLoggedIn: boolean
}

const COLORS = ['Semua', 'Merah', 'Putih', 'Merah Muda', 'Kuning', 'Peach']
const SIZES = ['Semua', 'Kecil', 'Sedang', 'Besar']

export default function CatalogClient({ initialProducts, favoritesMap, isLoggedIn }: CatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSize, setSelectedSize] = useState('Semua')
  const [selectedColor, setSelectedColor] = useState('Semua')
  const [sortBy, setSortBy] = useState('newest') // newest, price_asc, price_desc
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Filtering Logic
  const filteredProducts = initialProducts.filter((product) => {
    if (!product.is_active) return false
    
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesSize = selectedSize === 'Semua' || product.size === selectedSize
    
    const matchesColor = selectedColor === 'Semua' || product.color === selectedColor

    return matchesSearch && matchesSize && matchesColor
  })

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.price - b.price
    }
    if (sortBy === 'price_desc') {
      return b.price - a.price
    }
    // newest (default)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10 sm:pt-28 md:py-10 animate-fade-in-up">
      {/* Page Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-primary">
          Katalog Bouquet Bunga
        </h1>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Temukan rangkaian bunga sempurna yang mewakili perasaan Anda.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-1 space-y-8 bg-white p-6 rounded-2xl border border-brand-neutral-1/10 h-fit">
          <div>
            <h3 className="font-serif text-lg font-semibold text-brand-primary mb-4">Pencarian</h3>
            <input
              type="text"
              placeholder="Cari bouquet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-full text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent-soft smooth-transition"
            />
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold text-brand-primary mb-4">Ukuran</h3>
            <div className="flex flex-col space-y-2">
              {SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium smooth-transition cursor-pointer ${
                    selectedSize === size
                      ? 'bg-brand-accent-soft/20 text-brand-accent-bold font-semibold'
                      : 'text-brand-primary/75 hover:bg-brand-surface hover:text-brand-primary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold text-brand-primary mb-4">Warna</h3>
            <div className="flex flex-col space-y-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium smooth-transition cursor-pointer ${
                    selectedColor === color
                      ? 'bg-brand-accent-soft/20 text-brand-accent-bold font-semibold'
                      : 'text-brand-primary/75 hover:bg-brand-surface hover:text-brand-primary'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile Filter Toggle & Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar & Mobile Filter Drawer */}
          <div className="bg-white p-4 rounded-2xl border border-brand-neutral-1/10 shadow-sm space-y-4 mb-6">
            {/* Search Input (Mobile/Tablet only) */}
            <div className="w-full lg:hidden">
              <input
                type="text"
                placeholder="Cari bouquet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent-soft text-brand-primary"
              />
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className={`flex-1 lg:hidden h-10 flex items-center justify-center gap-2 border px-4 rounded-full text-[11px] font-bold uppercase tracking-wider smooth-transition cursor-pointer ${
                  mobileFiltersOpen
                    ? 'bg-brand-accent-soft/20 border-brand-accent-soft text-brand-accent-bold'
                    : 'bg-brand-surface border-brand-neutral-1/40 text-brand-primary'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filter Bunga
              </button>

              {/* Desktop Results Count */}
              <div className="hidden lg:block text-xs font-bold uppercase tracking-wider text-brand-primary/60">
                Menampilkan {sortedProducts.length} Produk
              </div>

              {/* Sort Selector */}
              <div className="flex-1 lg:flex-none h-10 flex items-center justify-between gap-2 bg-brand-surface border border-brand-neutral-1/40 px-4 rounded-full text-xs text-brand-primary">
                <span className="text-[10px] uppercase tracking-wider text-brand-primary/50 font-bold hidden sm:inline">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-[11px] font-bold uppercase tracking-wider text-brand-primary cursor-pointer w-full text-center lg:text-left"
                >
                  <option value="newest">Terbaru</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Mobile Filter Drawer (Inside the same card) */}
            {mobileFiltersOpen && (
              <div className="lg:hidden border-t border-brand-neutral-1/10 pt-4 grid grid-cols-2 gap-3.5 animate-fade-in">
                {/* Ukuran Filter Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-brand-primary/50 uppercase tracking-widest pl-1">Ukuran</label>
                  <div className="h-10 flex items-center bg-brand-surface border border-brand-neutral-1/40 px-3 rounded-full text-xs text-brand-primary">
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-[11px] font-bold uppercase tracking-wider text-brand-primary cursor-pointer w-full text-center"
                    >
                      {SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size === 'Semua' ? 'Semua Ukuran' : size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Warna Filter Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-brand-primary/50 uppercase tracking-widest pl-1">Warna</label>
                  <div className="h-10 flex items-center bg-brand-surface border border-brand-neutral-1/40 px-3 rounded-full text-xs text-brand-primary">
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="bg-transparent border-none focus:outline-none text-[11px] font-bold uppercase tracking-wider text-brand-primary cursor-pointer w-full text-center"
                    >
                      {COLORS.map((color) => (
                        <option key={color} value={color}>
                          {color === 'Semua' ? 'Semua Warna' : color}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grid Products */}
          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  initialIsFavorite={!!favoritesMap[product.id]}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-brand-neutral-1/10">
              <svg className="w-16 h-16 text-brand-neutral-3/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-serif text-xl font-bold text-brand-primary">Bunga Tidak Ditemukan</h3>
              <p className="text-sm text-brand-primary/60 mt-1 font-sans">
                Cobalah mengubah kata kunci pencarian atau filter yang Anda gunakan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
