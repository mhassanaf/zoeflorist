import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { createClient } from '@/utils/supabase/server'
import { ToastProvider } from '@/components/Toast'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Zoéflorist — Organic Elegance Artisanal Bouquets',
  description: 'Premium boutique florist offering high-end artisanal floral arrangements and bouquets.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let profile = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      profile = data
    }
  } catch (error) {
    console.error('Error loading session in layout:', error)
  }

  return (
    <html lang="id" className={`${playfair.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-brand-surface text-brand-primary">
        <ToastProvider>
          {/* Navigation Bar */}
          <Navbar profile={profile} />

          {/* Page content */}
          <main className="flex-grow flex flex-col w-full max-w-full min-w-0 overflow-x-hidden">{children}</main>

        {/* Footer */}
        <footer className="bg-brand-primary text-brand-surface py-12 mt-20 border-t border-brand-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex flex-col space-y-4">
                <span className="font-serif text-2xl font-bold tracking-tight text-brand-accent-soft">
                  Zoéflorist
                </span>
                <p className="text-sm text-brand-surface/75 max-w-xs font-sans">
                  Menyajikan keindahan alami lewat rangkaian bunga segar premium yang dirancang secara detail untuk momen berharga Anda.
                </p>
              </div>

              <div>
                <h4 className="font-serif text-lg font-semibold mb-4 text-brand-accent-soft">Navigasi</h4>
                <ul className="space-y-2 text-sm text-brand-surface/80 font-sans">
                  <li><a href="/" className="hover:text-brand-accent-soft smooth-transition">Beranda</a></li>
                  <li><a href="/katalog" className="hover:text-brand-accent-soft smooth-transition">Katalog Produk</a></li>
                  <li><a href="/favorit" className="hover:text-brand-accent-soft smooth-transition">Koleksi Favorit</a></li>
                  <li><a href="/panduan" className="hover:text-brand-accent-soft smooth-transition">Panduan Pemesanan</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-serif text-lg font-semibold mb-4 text-brand-accent-soft">Bantuan & Kontak</h4>
                <ul className="space-y-2 text-sm text-brand-surface/80 font-sans">
                  <li>Email: zoeflorist@gmail.com</li>
                  <li>WhatsApp: +62 858 1711 2126</li>
                  <li>Alamat: Jl. Cibiru Indah V No.23, Cibiru Wetan, Kec. Cileunyi, Kabupaten Bandung, Jawa Barat 40625</li>
                </ul>
              </div>

              <div>
                <h4 className="font-serif text-lg font-semibold mb-4 text-brand-accent-soft">Jam Operasional</h4>
                <p className="text-sm text-brand-surface/80 font-sans">
                  Senin - Sabtu: 08:00 - 20:00 WIB<br />
                  Minggu: 09:00 - 17:00 WIB
                </p>
              </div>
            </div>

            <div className="border-t border-brand-surface/10 mt-8 pt-6 text-center text-xs text-brand-surface/60 font-sans">
              &copy; {new Date().getFullYear()} Zoéflorist. Hak Cipta Dilindungi. Dibuat untuk UAS Pemrograman Web.
            </div>
          </div>
        </footer>
        </ToastProvider>
      </body>
    </html>
  )
}
