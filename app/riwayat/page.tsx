import { getUserOrders } from '@/app/actions/orders'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrderCardClient from '@/components/OrderCardClient'

export const dynamic = 'force-dynamic'

export default async function RiwayatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Silakan login terlebih dahulu untuk melihat riwayat pesanan.')
  }

  const orders = await getUserOrders()

  // Fetch reviews to check if they have already reviewed a product
  let userReviews: any[] = []
  try {
    const { data } = await supabase
      .from('reviews')
      .select('product_id, rating, comment')
      .eq('user_id', user.id)
    userReviews = data || []
  } catch (err) {
    console.error('Error fetching user reviews:', err)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
      {/* Back Button */}
      <div className="mb-6 flex justify-start">
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
        <span className="text-xs uppercase tracking-widest text-brand-accent-bold font-bold">Daftar Transaksi</span>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-primary mt-1">
          Riwayat Pesanan Anda
        </h1>
        <p className="text-sm text-brand-primary/60 mt-2 font-sans">
          Pantau status pengerjaan dan pengiriman buket bunga Anda secara real-time.
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-8">
          {orders.map((order: any) => (
            <OrderCardClient
              key={order.id}
              order={order}
              userReviews={userReviews}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-brand-neutral-1/10 max-w-xl mx-auto">
          <svg className="w-16 h-16 text-brand-neutral-3/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="font-serif text-xl font-bold text-brand-primary">Belum Ada Riwayat Pesanan</h3>
          <p className="text-sm text-brand-primary/60 mt-2 px-6 font-sans leading-relaxed">
            Anda belum pernah memesan buket bunga premium kami sebelumnya. Mulai temukan rangkaian bunga favorit Anda!
          </p>
          <div className="mt-6">
            <a
              href="/katalog"
              className="inline-block bg-brand-primary hover:bg-brand-primary/95 text-white text-sm font-semibold py-3 px-8 rounded-full smooth-transition"
            >
              Belanja Sekarang
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
