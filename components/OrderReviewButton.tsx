'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createOrUpdateReview } from '@/app/actions/reviews'

interface Review {
  rating: number
  comment: string
}

interface OrderReviewButtonProps {
  productId: string
  productName: string
  productImage: string
  initialReview?: Review
}

export default function OrderReviewButton({
  productId,
  productName,
  productImage,
  initialReview,
}: OrderReviewButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [rating, setRating] = useState(initialReview?.rating || 5)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [comment, setComment] = useState(initialReview?.comment || '')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleOpen = () => {
    setRating(initialReview?.rating || 5)
    setComment(initialReview?.comment || '')
    setErrorMsg('')
    setSuccessMsg('')
    setIsOpen(true)
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    startTransition(async () => {
      const res = await createOrUpdateReview(productId, rating, comment)

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Ulasan Anda berhasil disimpan!')
        setTimeout(() => {
          setIsOpen(false)
          router.refresh()
        }, 1500)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider smooth-transition cursor-pointer ${
          initialReview
            ? 'border border-brand-neutral-1/30 text-brand-primary/80 hover:bg-brand-surface hover:text-brand-primary'
            : 'bg-brand-accent-bold text-white hover:bg-brand-accent-bold/90 shadow-sm hover:shadow'
        }`}
      >
        {initialReview ? 'Ubah Ulasan' : 'Beri Ulasan'}
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-brand-neutral-1/10 animate-fade-in-up z-10 p-5 sm:p-7 my-auto transform transition-all">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-brand-surface text-brand-primary/40 hover:text-brand-primary disabled:opacity-30 smooth-transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Title */}
            <div className="mb-4 text-left">
              <h3 className="font-serif text-xl font-bold text-brand-primary tracking-tight">
                {initialReview ? 'Perbarui Ulasan Anda' : 'Berikan Ulasan'}
              </h3>
              <p className="text-[11px] text-brand-primary/60 font-sans mt-0.5 leading-relaxed">
                Bagikan pengalaman Anda tentang keindahan buket bunga kami.
              </p>
            </div>

            {/* Product Summary */}
            <div className="flex gap-3 p-2.5 bg-brand-surface rounded-2xl border border-brand-neutral-1/10 mb-4 items-center text-left">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-brand-neutral-1/10">
                <Image
                  src={productImage || '/placeholder.png'}
                  alt={productName}
                  fill
                  className="object-cover"
                />
              </div>
              <h4 className="text-xs font-bold text-brand-primary line-clamp-1 flex-grow">{productName}</h4>
            </div>

            {errorMsg && (
              <div className="mb-4 bg-brand-accent-bold/10 border border-brand-accent-bold/30 text-brand-accent-bold px-3.5 py-2.5 rounded-xl text-xs font-semibold font-sans text-left">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold font-sans text-left animate-fade-in">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating Card */}
              <div className="flex flex-col items-center justify-center py-3 bg-brand-surface/60 rounded-2xl border border-brand-neutral-1/5">
                <span className="text-[9px] uppercase tracking-widest text-brand-primary/50 font-bold mb-1.5 font-sans">
                  Rating Produk
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isLit = hoveredRating !== null ? star <= hoveredRating : star <= rating
                    return (
                      <button
                        key={star}
                        type="button"
                        disabled={isPending}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="p-1 smooth-transition transform active:scale-95 disabled:scale-100 disabled:opacity-60 cursor-pointer"
                      >
                        <svg
                          className={`w-7 h-7 smooth-transition ${
                            isLit
                              ? 'text-amber-500 fill-current filter drop-shadow-[0_0_2px_rgba(245,158,11,0.25)] scale-105'
                              : 'text-brand-neutral-1/20'
                          }`}
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                          />
                        </svg>
                      </button>
                    )
                  })}
                </div>
                <span className="text-xs font-bold text-brand-primary mt-1.5 font-sans">
                  {rating === 5 && 'Sempurna'}
                  {rating === 4 && 'Sangat Bagus'}
                  {rating === 3 && 'Cukup'}
                  {rating === 2 && 'Kurang'}
                  {rating === 1 && 'Sangat Kurang'}
                </span>
              </div>

              {/* Comment Textarea */}
              <div className="text-left">
                <label htmlFor="comment" className="block text-[10px] font-bold text-brand-primary/60 uppercase tracking-widest mb-1.5 font-sans">
                  Komentar Ulasan
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={isPending}
                  required
                  placeholder="Ceritakan keharuman, kesegaran bunga, atau keindahan penataan buket..."
                  className="w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent-soft disabled:opacity-50 font-sans leading-relaxed transition-all"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="w-1/2 border border-brand-neutral-1/30 hover:bg-brand-surface text-brand-primary font-bold py-3 px-4 rounded-full text-xs uppercase tracking-wider smooth-transition disabled:opacity-50 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold py-3 px-4 rounded-full text-xs uppercase tracking-wider smooth-transition shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
                >
                  {isPending ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
