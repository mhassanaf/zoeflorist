'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteReviewAdmin } from '@/app/actions/reviews'
import { useToast } from '@/components/Toast'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  profiles: {
    name: string
    email: string
  } | null
  products: {
    name: string
  } | null
}

interface AdminReviewsTableProps {
  initialReviews: Review[]
}

export default function AdminReviewsTable({ initialReviews }: AdminReviewsTableProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [reviews, setReviews] = useState(initialReviews)

  const handleDelete = (reviewId: string, productName: string, customerName: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus ulasan untuk "${productName}" dari "${customerName}"? Tindakan ini tidak dapat dibatalkan.`
    )

    if (!confirmed) return

    const loadingToastId = showToast('Menghapus ulasan...', 'loading')

    startTransition(async () => {
      const res = await deleteReviewAdmin(reviewId)

      if (res.error) {
        showToast(`Gagal menghapus ulasan: ${res.error}`, 'error')
      } else {
        showToast('Ulasan berhasil dihapus.', 'success')
        setReviews((prev) => prev.filter((r) => r.id !== reviewId))
        router.refresh()
      }
    })
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-brand-neutral-1/10">
        <h2 className="font-serif text-xl font-bold text-brand-primary">Ulasan & Rating Produk Terbaru</h2>
        <p className="text-xs text-brand-primary/60 mt-1 font-sans">
          Kelola tanggapan, ulasan, dan kepuasan pelanggan terhadap kualitas bouquet Anda.
        </p>
      </div>



      <div className="w-full overflow-x-auto">
        {reviews.length > 0 ? (
          <table className="w-full min-w-[800px] text-left border-collapse font-sans">
            <thead>
              <tr className="bg-brand-surface text-[10px] uppercase tracking-wider font-semibold text-brand-primary/70 border-b border-brand-neutral-1/10">
                <th className="py-4 px-6">Pelanggan</th>
                <th className="py-4 px-6">Produk</th>
                <th className="py-4 px-6">Rating</th>
                <th className="py-4 px-6">Komentar</th>
                <th className="py-4 px-6">Tanggal</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-neutral-1/10 text-sm">
              {reviews.map((review) => (
                <tr key={review.id} className="hover:bg-brand-surface/20 smooth-transition">
                  <td className="py-4 px-6">
                    <div className="font-semibold">{review.profiles?.name || 'Pelanggan'}</div>
                    <div className="text-xs text-brand-primary/60">{review.profiles?.email}</div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-brand-primary">
                    {review.products?.name || 'Produk Dihapus'}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-0.5 items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating ? 'text-amber-500 fill-current' : 'text-brand-neutral-1/20'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 max-w-xs sm:max-w-md">
                    <p className="text-xs leading-relaxed text-brand-primary/80 line-clamp-3">
                      {review.comment || <span className="italic text-brand-primary/40">Tidak ada ulasan tertulis</span>}
                    </p>
                  </td>
                  <td className="py-4 px-6 text-xs text-brand-primary/60 whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() =>
                        handleDelete(
                          review.id,
                          review.products?.name || 'Produk Dihapus',
                          review.profiles?.name || 'Pelanggan'
                        )
                      }
                      disabled={isPending}
                      className="text-xs font-semibold text-brand-accent-bold hover:text-brand-accent-bold/80 disabled:opacity-50 smooth-transition cursor-pointer"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-brand-primary/50 font-sans">
            Belum ada ulasan yang masuk untuk produk Anda.
          </div>
        )}
      </div>
    </div>
  )
}
