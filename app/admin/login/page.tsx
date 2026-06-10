'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/app/actions/auth'
import { createClient } from '@/utils/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        setErrorMsg(result.error)
      } else {
        // Double check if admin
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profile?.role === 'admin') {
            router.refresh()
            router.push('/admin/dashboard')
            return
          }
        }
        setErrorMsg('Akses ditolak. Akun ini tidak terdaftar sebagai Administrator.')
      }
    })
  }

  return (
    <div className="flex-grow flex items-center justify-center py-20 px-4 bg-brand-surface animate-fade-in-up">
      <div className="max-w-md w-full space-y-8 bg-brand-primary p-8 sm:p-10 rounded-2xl shadow-xl text-brand-surface border border-white/10">
        <div>
          <h1 className="text-center font-serif text-3xl font-extrabold text-brand-accent-soft">
            Portal Admin Zoé
          </h1>
          <p className="mt-2 text-center text-sm text-brand-surface/70 font-sans">
            Gunakan akun staff administrasi untuk masuk kelola sistem
          </p>
        </div>

        {errorMsg && (
          <div className="bg-brand-accent-bold text-white px-4 py-3 rounded-lg text-sm font-medium border border-red-900/40">
            {errorMsg}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-brand-surface/80">
              Email Administrator
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5 block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent-soft text-sm"
              placeholder="admin@zoeflorist.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-brand-surface/80">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1.5 block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent-soft text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-full text-brand-primary bg-brand-accent-soft hover:bg-brand-accent-soft/90 smooth-transition focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Mengautentikasi...' : 'Masuk Portal'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <a href="/" className="text-xs text-brand-surface/60 hover:text-brand-surface smooth-transition">
            &larr; Kembali ke Beranda Toko
          </a>
        </div>
      </div>
    </div>
  )
}
