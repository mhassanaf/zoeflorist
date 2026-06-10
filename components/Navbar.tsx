'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

interface NavbarProps {
  profile: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // Sync cart item counts dynamically
  useEffect(() => {
    const updateCartCount = () => {
      if (profile && profile.role === 'user') {
        const storedCart = localStorage.getItem('zoeflorist_cart')
        if (storedCart) {
          const cart = JSON.parse(storedCart)
          const total = cart.reduce((sum: number, item: any) => sum + item.quantity, 0)
          setCartCount(total)
        } else {
          setCartCount(0)
        }
      } else {
        setCartCount(0)
      }
    }

    updateCartCount()
    window.addEventListener('cart-updated', updateCartCount)
    return () => {
      window.removeEventListener('cart-updated', updateCartCount)
    }
  }, [profile])

  const handleLogout = async () => {
    await signOut()
    router.refresh()
    router.push('/')
  }

  const isActive = (path: string) => pathname === path

  const navLinks = [
    { name: 'Beranda', href: '/' },
    { name: 'Katalog', href: '/katalog' },
  ]

  if (profile && profile.role === 'user') {
    navLinks.push(
      { name: 'Favorit', href: '/favorit' },
      { name: 'Riwayat Pesanan', href: '/riwayat' }
    )
  }

  const showCart = profile && profile.role === 'user'

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-brand-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex flex-col group">
              <span className="font-serif text-2xl font-bold tracking-tight text-brand-primary group-hover:text-brand-accent-bold smooth-transition">
                Zoéflorist
              </span>
              <span className="text-[9px] uppercase tracking-widest text-brand-neutral-3 -mt-1 font-sans">
                Organic Elegance
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm font-medium tracking-wide smooth-transition relative py-2 ${
                  isActive(link.href)
                    ? 'text-brand-accent-bold font-semibold'
                    : 'text-brand-primary/80 hover:text-brand-primary'
                }`}
              >
                {link.name}
                {isActive(link.href) && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-accent-bold rounded-full" />
                )}
              </Link>
            ))}

            {profile?.role === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="bg-brand-accent-soft/20 text-brand-primary border border-brand-accent-soft/50 px-4 py-2 rounded-full text-xs font-semibold hover:bg-brand-accent-soft/40 smooth-transition"
              >
                Dashboard Admin
              </Link>
            )}
          </div>

          {/* Auth & Cart Actions (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {showCart && (
              <Link
                href="/keranjang"
                className="relative p-2.5 text-brand-primary hover:text-brand-accent-bold smooth-transition cursor-pointer mr-2 hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-accent-bold text-white text-[9px] font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center animate-fade-in shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {profile ? (
              <div className="flex items-center space-x-4">
                <span className="text-xs text-brand-primary/70 font-medium">
                  Halo, <span className="font-semibold text-brand-primary">{profile.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-brand-accent-bold text-white text-xs font-medium px-5 py-2 rounded-full hover:bg-brand-accent-bold/90 shadow-sm hover:shadow smooth-transition cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-brand-primary text-white text-xs font-medium px-6 py-2.5 rounded-full hover:bg-brand-primary/95 shadow-sm hover:shadow-md smooth-transition"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>

          {/* Mobile Right Controls (Cart + Menu Button) */}
          <div className="flex items-center md:hidden space-x-2">
            {showCart && (
              <Link
                href="/keranjang"
                className="relative p-2.5 text-brand-primary hover:text-brand-accent-bold smooth-transition cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-accent-bold text-white text-[9px] font-bold w-5.5 h-5.5 rounded-full flex items-center justify-center animate-fade-in shadow-sm">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-primary hover:text-brand-accent-bold focus:outline-none p-2 rounded-md smooth-transition"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass-panel border-t border-brand-primary/5 px-4 pt-2 pb-6 space-y-3 animate-fade-in-up">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              onClick={() => setIsOpen(false)}
              href={link.href}
              className={`block px-3 py-2.5 rounded-lg text-base font-medium smooth-transition ${
                isActive(link.href)
                  ? 'bg-brand-accent-soft/20 text-brand-accent-bold font-semibold'
                  : 'text-brand-primary/80 hover:bg-brand-primary/5 hover:text-brand-primary'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {profile?.role === 'admin' && (
            <Link
              onClick={() => setIsOpen(false)}
              href="/admin/dashboard"
              className="block px-3 py-2.5 rounded-lg text-base font-semibold bg-brand-accent-soft/20 text-brand-primary"
            >
              Dashboard Admin
            </Link>
          )}

          <div className="pt-4 border-t border-brand-primary/10">
            {profile ? (
              <div className="space-y-3 px-3">
                <p className="text-sm text-brand-primary/70">
                  Masuk sebagai: <span className="font-semibold text-brand-primary">{profile.name}</span>
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    handleLogout()
                  }}
                  className="w-full bg-brand-accent-bold text-white text-center py-2.5 rounded-full text-sm font-medium hover:bg-brand-accent-bold/90 smooth-transition cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                onClick={() => setIsOpen(false)}
                href="/login"
                className="block w-full bg-brand-primary text-white text-center py-2.5 rounded-full text-sm font-medium hover:bg-brand-primary/95 smooth-transition"
              >
                Masuk / Daftar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
