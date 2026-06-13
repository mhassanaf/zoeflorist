'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'
import { createClient } from '@/utils/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

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
            <div className="relative mt-1.5">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="block w-full pl-4 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-accent-soft text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-brand-accent-soft smooth-transition cursor-pointer"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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
          <Link href="/" className="text-xs text-brand-surface/60 hover:text-brand-surface smooth-transition">
            &larr; Kembali ke Beranda Toko
          </Link>
        </div>
      </div>
    </div>
  )
}
