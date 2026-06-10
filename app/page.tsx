import Image from 'next/image'
import Link from 'next/link'
import { getProducts, getBestSellers } from '@/app/actions/products'
import { getFavoritesMap } from '@/app/actions/favorites'
import { createClient } from '@/utils/supabase/server'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let user = null
  let isLoggedIn = false
  let favoritesMap: Record<string, boolean> = {}
  let bestSellers: any[] = []

  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    user = currentUser
    isLoggedIn = !!user
    
    // Fetch products (automatic seed runs inside this helper if table is empty)
    await getProducts()
    bestSellers = await getBestSellers(4)

    if (isLoggedIn) {
      favoritesMap = await getFavoritesMap()
    }
  } catch (error) {
    console.error('Error in home page data fetching:', error)
  }

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative w-full h-[85vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_banner.png"
            alt="Zoeflorist interior boutique"
            fill
            priority
            className="object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-surface/75 via-brand-surface/30 to-transparent md:bg-gradient-to-r md:from-brand-surface/85 md:via-brand-surface/40 md:to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-left flex flex-col items-start space-y-6 animate-fade-in-up">
          <span className="text-xs uppercase tracking-widest text-brand-primary/80 font-semibold bg-brand-surface/60 backdrop-blur px-4 py-1.5 rounded-full border border-brand-primary/10">
            Koleksi Bouquet Premium
          </span>
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-brand-primary max-w-2xl leading-[1.1]">
            Kecantikan Organik, Keanggunan Abadi
          </h1>
          <p className="font-sans text-base md:text-lg text-brand-primary/80 max-w-md leading-relaxed">
            Menyusun emosi terbaik Anda lewat rangkaian bunga segar pilihan yang dirancang eksklusif oleh botanist profesional kami.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/katalog"
              className="bg-brand-accent-bold text-white text-center py-3.5 px-8 rounded-full text-sm font-semibold hover:bg-brand-accent-bold/90 shadow-md hover:shadow-lg smooth-transition"
            >
              Jelajahi Katalog
            </Link>
            <Link
              href="#promises"
              className="bg-white/80 backdrop-blur text-brand-primary text-center border border-brand-neutral-1/40 py-3.5 px-8 rounded-full text-sm font-semibold hover:bg-white smooth-transition"
            >
              Komitmen Kami
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Brand Promises Section */}
      <section id="promises" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Mengapa Zoéflorist</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-primary mt-2">Komitmen Kami Pada Kualitas</h2>
          <div className="w-12 h-1 bg-brand-accent-soft mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-white p-8 rounded-2xl border border-brand-neutral-1/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-accent-soft/20 text-brand-accent-bold flex items-center justify-center mx-auto text-xl font-bold font-serif">
              1
            </div>
            <h3 className="font-serif text-xl font-semibold text-brand-primary">Desain Artisanal</h3>
            <p className="text-sm text-brand-primary/70 leading-relaxed font-sans">
              Setiap buket dirangkai khusus dengan keseimbangan tekstur dan palet warna yang dirancang estetik dan berkelas.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-brand-neutral-1/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-accent-soft/20 text-brand-accent-bold flex items-center justify-center mx-auto text-xl font-bold font-serif">
              2
            </div>
            <h3 className="font-serif text-xl font-semibold text-brand-primary">Bunga Segar Terbaik</h3>
            <p className="text-sm text-brand-primary/70 leading-relaxed font-sans">
              Kami memotong bunga langsung dari kebun mitra lokal pilihan setiap pagi untuk menjamin ketahanan kesegaran bunga.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-brand-neutral-1/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-accent-soft/20 text-brand-accent-bold flex items-center justify-center mx-auto text-xl font-bold font-serif">
              3
            </div>
            <h3 className="font-serif text-xl font-semibold text-brand-primary">Pengiriman Terjaga</h3>
            <p className="text-sm text-brand-primary/70 leading-relaxed font-sans">
              Layanan kurir khusus ber-AC yang memastikan pesanan Anda sampai di alamat tujuan dalam kondisi prima dan utuh.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Seasonal Edits Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-surface-dim rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 shadow-sm border border-brand-neutral-1/20">
          <div className="p-10 md:p-16 flex flex-col justify-center space-y-6">
            <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Kurasi Musim Panas</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-brand-primary leading-tight">
              Edisi Khusus: Sentuhan Kastil Hangat
            </h2>
            <p className="text-sm md:text-base text-brand-primary/80 font-sans leading-relaxed">
              Rayakan kehangatan matahari dengan rangkaian bunga matahari ceria, tulip putih, dan aksen kuncup chamomile segar yang membawa suasana alam langsung ke rumah Anda.
            </p>
            <div>
              <Link
                href="/katalog"
                className="inline-block bg-brand-primary hover:bg-brand-primary/95 text-white text-sm font-semibold py-3 px-8 rounded-full smooth-transition shadow-sm"
              >
                Lihat Koleksi Terbaru
              </Link>
            </div>
          </div>
          <div className="relative h-64 lg:h-auto min-h-[300px]">
            <Image
              src="/products/golden_dawn.png"
              alt="Edisi bunga matahari"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 4. Best Sellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-baseline mb-12">
          <div>
            <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Produk Populer</span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-primary mt-1">Pilihan Terbaik Pelanggan</h2>
          </div>
          <Link
            href="/katalog"
            className="text-brand-accent-bold hover:text-brand-primary font-sans text-sm font-semibold tracking-wide flex items-center gap-1 group mt-2 sm:mt-0 smooth-transition"
          >
            Lihat Semua Produk
            <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>

        {bestSellers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                initialIsFavorite={!!favoritesMap[product.id]}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-brand-neutral-1/10 text-brand-primary/60">
            Sedang memuat katalog bunga terbaik...
          </div>
        )}
      </section>
    </div>
  )
}
