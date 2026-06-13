'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function OrderGuidePage() {
  const steps = [
    {
      no: '01',
      title: 'Pilih & Sesuaikan Bouquet Bunga',
      desc: 'Jelajahi halaman Katalog kami untuk melihat berbagai pilihan bouquet bunga segar premium. Klik pada produk yang Anda inginkan, lalu pilih variasi ukuran (Kecil, Sedang, Besar) dan warna kertas pembungkus sesuai selera Anda sebelum menambahkannya ke keranjang belanja.',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      no: '02',
      title: 'Isi Formulir Pengiriman & Checkout',
      desc: 'Periksa keranjang belanja Anda dan klik "Proses ke Checkout". Isi formulir informasi penerima dengan lengkap: Nama Lengkap, Nomor WhatsApp aktif (sangat penting untuk notifikasi), dan Alamat Lengkap Pengiriman. Pilih metode pembayaran awal yang Anda inginkan (BCA Transfer, QRIS, atau E-wallet) dan buat pesanan.',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      no: '03',
      title: 'Menunggu Penentuan Ongkir oleh Admin',
      desc: 'Setelah order berhasil dikirim, status pengiriman pesanan Anda adalah "Pending" (Menunggu). Admin kami akan meninjau alamat pengiriman Anda secara manual untuk menentukan biaya ongkos kirim yang akurat dan hemat. Selama proses ini, area pembayaran pada detail pesanan Anda akan dikunci untuk mencegah kesalahan nominal.',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      no: '04',
      title: 'Pilih Metode Pengantaran & Transfer Dana',
      desc: 'Begitu admin menentukan ongkir, detail pesanan Anda di menu "Riwayat Pesanan" akan terbuka otomatis. Anda dapat memilih metode pengantaran: "Kirim (Delivery)" atau "Pickup di Toko" (ongkir otomatis berubah menjadi Rp 0). Setelah itu, lakukan transfer dana sesuai total nominal tagihan Anda ke rekening bank atau dompet digital Zoéflorist.',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      no: '05',
      title: 'Unggah Bukti Transfer / Struk',
      desc: 'Ambil screenshot atau foto bukti pembayaran transaksi Anda. Pada kotak unggah di sisi kanan detail pesanan, pilih file gambar bukti pembayaran tersebut, lalu tekan tombol "Kirim Bukti Pembayaran". Status transaksi Anda akan berubah menjadi "Menunggu Verifikasi".',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      no: '06',
      title: 'Verifikasi Pembayaran & Proses Pembuatan',
      desc: 'Tim admin kami akan memverifikasi bukti pembayaran Anda. Jika cocok, pembayaran dikonfirmasi "Lunas (Paid)", stok produk dikurangi otomatis, dan pesanan masuk ke tahap "Processing". Estimasi pengerjaan bouquet bunga (misal: "2 Hari Kerja") akan dikirimkan langsung ke catatan pesanan Anda. Anda tinggal bersantai menunggu pesanan Anda rampung!',
      icon: (
        <svg className="w-6 h-6 text-brand-accent-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      )
    }
  ]

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      {/* Header section */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brand-primary">
          Panduan Pemesanan Bunga
        </h1>
        <p className="text-sm sm:text-base text-brand-primary/70 max-w-2xl mx-auto font-sans leading-relaxed">
          Ikuti tata cara mudah memesan bouquet bunga premium di Zoéflorist, mulai dari pemilihan produk hingga proses pembayaran terverifikasi sukses.
        </p>
      </div>

      {/* Decorative Infographic Banner */}
      <div className="relative w-full h-[260px] sm:h-[350px] rounded-3xl overflow-hidden border border-brand-neutral-1/15 shadow-md mb-12 bg-brand-surface-dim/10 flex items-center justify-center">
        <Image
          src="/order_guide_banner.png"
          alt="Panduan Pemesanan Zoéflorist Infographic"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Interactive Step Timeline */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:left-8 before:w-[2px] before:bg-brand-neutral-1/20 before:hidden md:before:block">
        {steps.map((step, idx) => (
          <div key={step.no} className="relative flex flex-col md:flex-row gap-6 md:gap-12 items-start group">
            {/* Step Marker (Visible on Desktop) */}
            <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-brand-neutral-1/30 text-brand-accent-bold font-serif font-bold text-lg shadow-sm z-10 group-hover:border-brand-accent-bold smooth-transition select-none">
              {step.no}
            </div>

            {/* Step Content Card */}
            <div className="flex-grow bg-white border border-brand-neutral-1/10 p-6 sm:p-8 rounded-[24px] shadow-sm hover:shadow-md smooth-transition flex flex-col sm:flex-row gap-5 items-start text-left">
              {/* Icon Container */}
              <div className="p-3 bg-brand-surface rounded-2xl border border-brand-neutral-1/15 flex-shrink-0">
                {step.icon}
              </div>

              {/* Text Area */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="md:hidden text-xs font-bold uppercase tracking-wider text-brand-accent-bold/70 font-sans">Langkah {step.no}</span>
                  <h3 className="font-serif text-lg font-bold text-brand-primary leading-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-brand-primary/80 font-sans leading-relaxed">
                  {step.desc}
                </p>

                {/* Additional Helper info inside specific steps */}
                {step.no === '04' && (
                  <div className="mt-4 p-4 rounded-xl bg-brand-surface/40 border border-brand-neutral-1/10 space-y-2 text-xs font-sans text-brand-primary/75">
                    <span className="font-bold text-brand-primary block text-[10px] uppercase tracking-wider">Metode Transfer Rekening Resmi:</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <div><span className="font-semibold text-brand-primary">BCA:</span> 1672806768 (a/n zoeflorist)</div>
                      <div><span className="font-semibold text-brand-primary">Dana/GoPay:</span> 085817112126 (a/n zoeflorist)</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Footer Section */}
      <div className="text-center mt-16 p-8 rounded-3xl bg-brand-primary text-brand-surface space-y-5">
        <h3 className="font-serif text-2xl font-bold text-brand-accent-soft">
          Siap Menghias Momen Spesial Anda?
        </h3>
        <p className="text-xs sm:text-sm text-brand-surface/80 max-w-md mx-auto font-sans leading-relaxed">
          Temukan rangkaian bunga artisanal terindah dan berikan kejutan manis bagi orang terkasih Anda hari ini.
        </p>
        <div className="pt-2">
          <Link
            href="/katalog"
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-accent-bold hover:bg-brand-accent-bold/90 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg smooth-transition hover:scale-105 active:scale-95"
          >
            Mulai Belanja Sekarang
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
