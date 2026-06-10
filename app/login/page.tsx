'use client'

import { useState, useTransition, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, signUp, signInWithGoogle } from '@/app/actions/auth'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoginTab, setIsLoginTab] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // Get errors from URL redirection (e.g. from Google Auth callback failures)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setErrorMsg(errorParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      if (isLoginTab) {
        const result = await signIn(formData)
        if (result?.error) {
          setErrorMsg(result.error)
        } else {
          setSuccessMsg('Login berhasil! Mengalihkan...')
          router.refresh()
          setTimeout(() => {
            router.push('/')
          }, 1000)
        }
      } else {
        const result = await signUp(formData)
        if (result?.error) {
          setErrorMsg(result.error)
        } else {
          setSuccessMsg('Pendaftaran berhasil! Silakan cek email Anda (jika konfirmasi email aktif) atau langsung masuk.')
          setIsLoginTab(true)
        }
      }
    })
  }

  const handleGoogleLogin = async () => {
    setErrorMsg('')
    startTransition(async () => {
      await signInWithGoogle()
    })
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-brand-surface animate-fade-in-up">
      {/* Back Button */}
      <div className="w-full max-w-md mb-6 text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/20 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Beranda
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-brand-neutral-1/20">
        <div>
          <h2 className="text-center font-serif text-3xl font-extrabold text-brand-primary">
            {isLoginTab ? 'Selamat Datang' : 'Buat Akun Baru'}
          </h2>
          <p className="mt-2 text-center text-sm text-brand-primary/60 font-sans">
            {isLoginTab ? 'Masuk ke portal keindahan Zoéflorist' : 'Daftar untuk menikmati layanan floral premium'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-brand-neutral-1/30">
          <button
            onClick={() => {
              setIsLoginTab(true)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 pb-4 text-center text-sm font-semibold tracking-wide border-b-2 smooth-transition cursor-pointer ${
              isLoginTab ? 'border-brand-accent-bold text-brand-accent-bold' : 'border-transparent text-brand-primary/50'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => {
              setIsLoginTab(false)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            className={`flex-1 pb-4 text-center text-sm font-semibold tracking-wide border-b-2 smooth-transition cursor-pointer ${
              !isLoginTab ? 'border-brand-accent-bold text-brand-accent-bold' : 'border-transparent text-brand-primary/50'
            }`}
          >
            Daftar
          </button>
        </div>

        {errorMsg && (
          <div className="bg-brand-accent-bold/10 border border-brand-accent-bold/30 text-brand-accent-bold px-4 py-3 rounded-lg text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
            {successMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {!isLoginTab && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-primary">
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent-soft smooth-transition text-sm"
                placeholder="Zoé Doe"
              />
            </div>
          )}

          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-brand-primary">
              Alamat Email
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent-soft smooth-transition text-sm"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-primary">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full px-4 py-3 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent-soft smooth-transition text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-full text-white bg-brand-primary hover:bg-brand-primary/95 shadow-sm hover:shadow-md smooth-transition focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Memproses...' : isLoginTab ? 'Masuk' : 'Daftar Akun'}
            </button>
          </div>
        </form>

        {/* Google OAuth Divider */}
        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-neutral-1/30" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-brand-primary/45 font-sans">atau lanjut dengan</span>
          </div>
        </div>

        {/* Google OAuth Login Button */}
        <div className="mt-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-brand-neutral-1/40 rounded-full bg-white text-sm font-semibold text-brand-primary hover:bg-brand-surface smooth-transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {/* Google G Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" width="20px" height="20px">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.996 0 12 0 7.352 0 3.393 2.664 1.488 6.55l3.778 3.215z"
              />
              <path
                fill="#4285F4"
                d="M23.74 12.273c0-.796-.07-1.564-.2-2.3H12v4.618h6.586a5.626 5.626 0 0 1-2.44 3.69l3.8 3.232c2.223-2.046 3.794-5.06 3.794-9.24z"
              />
              <path
                fill="#FBBC05"
                d="M5.266 14.235L1.488 17.45c1.905 3.886 5.864 6.55 10.512 6.55 3.014 0 5.807-1.004 7.9-2.732l-3.8-3.232c-1.127.755-2.564 1.2-4.1 1.2-3.877 0-7.16-2.618-8.328-6.19a8.23 8.23 0 0 1-.406-1.841z"
              />
              <path
                fill="#34A853"
                d="M12 19.09c-3.877 0-7.16-2.618-8.328-6.19l-3.778 3.215c1.905 3.886 5.864 6.55 10.512 6.55V19.09z"
              />
            </svg>
            Masuk dengan Google
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center py-20 bg-brand-surface font-sans text-brand-primary/60">
        Memuat halaman masuk...
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
