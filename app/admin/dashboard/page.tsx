import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardStats, getAdminOrders } from '@/app/actions/orders'
import Link from 'next/link'
import AdminReviewsTable from '@/components/AdminReviewsTable'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  let stats: any = { totalSales: 0, customerCount: 0, productCount: 0, activeOrdersCount: 0 }
  let recentOrders: any[] = []
  let allReviews: any[] = []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  try {
    const [statsResult, ordersResult, reviewsResult] = await Promise.all([
      getDashboardStats(),
      getAdminOrders(),
      supabase
        .from('reviews')
        .select('*, profiles(name, email), products(name)')
        .order('created_at', { ascending: false })
    ])

    if (!('error' in statsResult)) {
      stats = statsResult
    }
    recentOrders = (ordersResult || []).slice(0, 5) // Show top 5
    allReviews = reviewsResult.data || []
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
  }

  const adminNav = [
    { name: 'Ringkasan', href: '/admin/dashboard', active: true },
    { name: 'Kelola Produk', href: '/admin/produk', active: false },
    { name: 'Kelola Pesanan', href: '/admin/pesanan', active: false },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-10 sm:pt-4 animate-fade-in-up">
      {/* Back to Shop Link */}
      <div className="mb-4 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Toko Utama
        </Link>
      </div>

      {/* Admin Title & Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-neutral-1/20 pb-6 mb-6 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-primary">Dashboard Administrator</h1>
          <p className="text-sm text-brand-primary/60 mt-1 font-sans">Panel kelola operasional Zoéflorist</p>
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

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-brand-neutral-1/10 shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Total Penjualan</span>
          <span className="font-serif text-2xl font-bold text-brand-accent-bold mt-2">
            Rp {Number(stats.totalSales).toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-green-600 mt-2 font-semibold font-sans">Transaksi Selesai & Berjalan</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-brand-neutral-1/10 shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Pesanan Aktif</span>
          <span className="font-serif text-3xl font-bold text-brand-primary mt-2">
            {stats.activeOrdersCount}
          </span>
          <span className="text-[10px] text-amber-600 mt-2 font-semibold font-sans">Status Pending & Processing</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-brand-neutral-1/10 shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Jumlah Pelanggan</span>
          <span className="font-serif text-3xl font-bold text-brand-primary mt-2">
            {stats.customerCount}
          </span>
          <span className="text-[10px] text-brand-primary/60 mt-2 font-sans">User Terdaftar</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-brand-neutral-1/10 shadow-sm flex flex-col justify-between">
          <span className="text-xs uppercase tracking-wider text-brand-primary/60 font-semibold font-sans">Total Bunga</span>
          <span className="font-serif text-3xl font-bold text-brand-primary mt-2">
            {stats.productCount}
          </span>
          <span className="text-[10px] text-brand-primary/60 mt-2 font-sans">Bouquet dalam Katalog</span>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="w-full bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-brand-neutral-1/10 flex justify-between items-center">
          <h2 className="font-serif text-xl font-bold text-brand-primary">Pesanan Terbaru</h2>
          <Link
            href="/admin/pesanan"
            className="text-xs font-semibold text-brand-accent-bold hover:text-brand-primary smooth-transition uppercase tracking-wider"
          >
            Lihat Semua Pesanan &rarr;
          </Link>
        </div>

        <div className="w-full overflow-x-auto">
          {recentOrders.length > 0 ? (
            <table className="w-full min-w-[800px] text-left border-collapse font-sans">
              <thead>
                <tr className="bg-brand-surface text-[10px] uppercase tracking-wider font-semibold text-brand-primary/70 border-b border-brand-neutral-1/10">
                  <th className="py-4 px-6">ID Pesanan</th>
                  <th className="py-4 px-6">Pelanggan</th>
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Total Harga</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-neutral-1/10 text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-brand-surface/20 smooth-transition">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-brand-primary">{order.id}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold">{order.profiles?.name || 'Pelanggan'}</div>
                      <div className="text-xs text-brand-primary/60">{order.profiles?.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 font-semibold text-brand-accent-bold">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          order.status === 'Completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : order.status === 'Cancelled'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : order.status === 'Processing'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-brand-primary/50 font-sans">
              Belum ada pesanan masuk.
            </div>
          )}
        </div>
      </div>

      {/* Reviews Moderation Table */}
      <AdminReviewsTable initialReviews={allReviews} />
    </div>
  )
}
