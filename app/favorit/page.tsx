import { getFavorites, getFavoritesMap } from '@/app/actions/favorites'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

export default async function FavoritPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Silakan login terlebih dahulu untuk melihat koleksi favorit Anda.')
  }

  const [favoritedProducts, favoritesMap] = await Promise.all([
    getFavorites(),
    getFavoritesMap()
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 sm:pt-6 md:pt-6 md:pb-12 animate-fade-in-up">
      {/* Back Button */}
      <div className="mb-3 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Beranda
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-12 text-center md:text-left">
        <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Koleksi Pribadi</span>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-primary mt-1">
          Bunga Favorit Anda
        </h1>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Rangkaian buket bunga premium yang telah Anda simpan sebelumnya.
        </p>
      </div>

      {favoritedProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {favoritedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              initialIsFavorite={!!favoritesMap[product.id]}
              isLoggedIn={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-brand-neutral-1/10 max-w-xl mx-auto">
          <svg className="w-16 h-16 text-brand-neutral-3/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="font-serif text-xl font-bold text-brand-primary">Belum Ada Favorit</h3>
          <p className="text-sm text-brand-primary/60 mt-2 px-6 font-sans leading-relaxed">
            Jelajahi katalog kami dan ketuk ikon hati pada produk bunga yang Anda sukai untuk menyimpannya di sini.
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
      )}
    </div>
  )
}
