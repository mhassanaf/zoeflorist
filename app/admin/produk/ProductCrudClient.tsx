'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { createProduct, updateProduct, deleteProduct, uploadProductImage } from '@/app/actions/products'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  size: 'Kecil' | 'Sedang' | 'Besar'
  color: string
  stock: number
  is_active: boolean
}

interface ProductCrudClientProps {
  initialProducts: Product[]
}

export default function ProductCrudClient({ initialProducts }: ProductCrudClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [products, setProducts] = useState<Product[]>(initialProducts)

  // Portal mounted state
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Modal / Form state
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(0)
  const [size, setSize] = useState<'Kecil' | 'Sedang' | 'Besar'>('Sedang')
  const [color, setColor] = useState('Umum')
  const [stock, setStock] = useState(10)
  const [imageUrl, setImageUrl] = useState('/products/rose_romance.png')
  const [isActive, setIsActive] = useState(true)

  // Upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('/products/rose_romance.png')

  const handleOpenAdd = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setPrice(350000)
    setSize('Sedang')
    setColor('Umum')
    setStock(10)
    setImageUrl('/products/rose_romance.png')
    setIsActive(true)
    setImageFile(null)
    setPreviewUrl('/products/rose_romance.png')
    setIsOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id)
    setName(p.name)
    setDescription(p.description)
    setPrice(p.price)
    setSize(p.size)
    setColor('Umum')
    setStock(p.stock)
    setImageUrl(p.image_url)
    setIsActive(p.is_active)
    setImageFile(null)
    setPreviewUrl(p.image_url || '/placeholder.png')
    setIsOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToastId = showToast(
      editingId ? 'Memperbarui bouquet bunga...' : 'Menambahkan bouquet bunga...',
      'loading'
    )

    let finalImageUrl = imageUrl

    if (imageFile) {
      const formData = new FormData()
      formData.append('file', imageFile)
      const uploadRes = await uploadProductImage(formData)
      if (uploadRes.error) {
        showToast(`Gagal mengunggah gambar: ${uploadRes.error}`, 'error')
        return
      }
      if (uploadRes.url) {
        finalImageUrl = uploadRes.url
      }
    }

    const productPayload = {
      name,
      description,
      price: Number(price),
      size,
      color: 'Umum',
      stock: Number(stock),
      image_url: finalImageUrl,
      is_active: isActive,
    }

    startTransition(async () => {
      let res
      if (editingId) {
        res = await updateProduct(editingId, productPayload)
      } else {
        res = await createProduct(productPayload)
      }

      if (res.error) {
        showToast(res.error, 'error')
      } else {
        showToast(
          editingId ? 'Bouquet bunga berhasil diperbarui!' : 'Bouquet bunga berhasil ditambahkan!',
          'success'
        )
        setIsOpen(false)
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk bouquet bunga ini?')) return

    const loadingToastId = showToast('Menghapus bouquet...', 'loading')

    startTransition(async () => {
      const res = await deleteProduct(id)
      if (res.error) {
        showToast(`Gagal menghapus: ${res.error}`, 'error')
      } else {
        showToast('Bouquet bunga berhasil dihapus!', 'success')
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    })
  }

  const adminNav = [
    { name: 'Ringkasan', href: '/admin/dashboard', active: false },
    { name: 'Kelola Produk', href: '/admin/produk', active: true },
    { name: 'Kelola Pesanan', href: '/admin/pesanan', active: false },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      {/* Back Button */}
      <div className="mb-6 flex justify-start">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 hover:bg-white text-brand-primary hover:text-brand-accent-bold border border-brand-neutral-1/10 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow smooth-transition cursor-pointer group"
        >
          <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Admin Title & Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-neutral-1/20 pb-6 mb-10 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-primary">Manajemen Produk</h1>
          <p className="text-sm text-brand-primary/60 mt-1 font-sans">Kelola persediaan bouquet bunga segar</p>
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

      {/* Toolbar */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleOpenAdd}
          className="bg-brand-primary text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-full hover:bg-brand-primary/95 shadow smooth-transition cursor-pointer"
        >
          &#43; Tambah Bouquet Baru
        </button>
      </div>

      {/* Products Table */}
      <div className="w-full bg-white rounded-2xl border border-brand-neutral-1/10 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          {products.length > 0 ? (
            <table className="w-full min-w-[800px] text-left border-collapse font-sans">
              <thead>
                <tr className="bg-brand-surface text-[10px] uppercase tracking-wider font-semibold text-brand-primary/70 border-b border-brand-neutral-1/10">
                  <th className="py-4 px-6 w-24">Buket</th>
                  <th className="py-4 px-6">Nama Bouquet</th>
                  <th className="py-4 px-6">Spesifikasi</th>
                  <th className="py-4 px-6">Harga</th>
                  <th className="py-4 px-6">Stok</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-neutral-1/10 text-sm">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-surface/20 smooth-transition">
                    <td className="py-4 px-6">
                      <div className="relative w-12 h-12 bg-brand-surface rounded overflow-hidden">
                        <Image
                          src={p.image_url || '/placeholder.png'}
                          alt={p.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-brand-primary">{p.name}</div>
                      <div className="text-xs text-brand-primary/50 line-clamp-1 max-w-xs">{p.description}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-surface border border-brand-neutral-1/20 mr-1.5">{p.size}</span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-brand-primary">
                      Rp {p.price.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-6 font-semibold font-mono text-brand-primary">
                      {p.stock}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        {p.is_active ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="text-xs text-brand-primary/70 hover:text-brand-primary font-semibold underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-brand-accent-bold hover:text-brand-accent-bold/80 font-semibold underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 text-brand-primary/50">
              Belum ada produk bunga yang terdaftar.
            </div>
          )}
        </div>
      </div>

      {/* CRUD Overlay Form Modal via Portal */}
      {isOpen && mounted && createPortal(
        <>
          {/* Backdrop layer */}
          <div 
            className="fixed inset-0 bg-brand-primary/45 backdrop-blur-md animate-fade-in z-50 cursor-pointer"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-brand-neutral-1/20 shadow-2xl overflow-y-auto max-h-[90vh] animate-fade-in-up flex flex-col">
              <div className="flex justify-between items-baseline border-b border-brand-neutral-1/10 pb-4 mb-6">
                <h2 className="font-serif text-xl font-bold text-brand-primary">
                  {editingId ? 'Edit Bouquet Bunga' : 'Tambah Bouquet Baru'}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-brand-primary/50 hover:text-brand-primary text-xl font-bold focus:outline-none cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Nama Bouquet</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                      placeholder="cth: Sweet Peony Dream"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Harga (IDR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Deskripsi Produk</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 block w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    placeholder="Tulis detail rangkaian bunga, dedaunan, dan kertas wrap..."
                  />
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Ukuran</label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value as any)}
                      className="mt-1.5 block w-full px-3 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    >
                      <option value="Kecil">Kecil</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Besar">Besar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Jumlah Stok</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={stock}
                      onChange={(e) => setStock(Number(e.target.value))}
                      className="mt-1.5 block w-full px-4 py-2.5 bg-brand-surface border border-brand-neutral-1/40 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary/40"
                    />
                  </div>
                </div>

                {/* File Upload and Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-primary">Gambar Bouquet</label>
                    <div className="relative border border-dashed border-brand-neutral-1/80 rounded-xl p-4 bg-brand-surface/40 hover:bg-brand-surface smooth-transition flex flex-col items-center justify-center cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        required={!editingId}
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <svg className="w-8 h-8 text-brand-primary/45 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-brand-primary/70 text-center">
                        {imageFile ? imageFile.name : 'Pilih Berkas Gambar (.png, .jpg)'}
                      </span>
                      <span className="text-[10px] text-brand-primary/40 text-center mt-1">Maksimal 5MB</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary/50 mb-2 self-start sm:self-center">Pratinjau Gambar</span>
                    <div className="relative w-32 h-32 bg-brand-surface rounded-xl border border-brand-neutral-1/30 overflow-hidden shadow-inner flex items-center justify-center">
                      <Image
                        src={previewUrl}
                        alt="Pratinjau Bouquet"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-start">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5.5 h-5.5 accent-brand-accent-bold text-brand-accent-bold border border-brand-neutral-1/40 rounded cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-brand-primary">Aktifkan dalam katalog</span>
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-brand-neutral-1/10">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2.5 rounded-full border border-brand-neutral-1/40 text-xs font-semibold uppercase tracking-wider hover:bg-brand-surface smooth-transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 rounded-full bg-brand-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-primary/95 shadow smooth-transition disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? 'Menyimpan...' : 'Simpan Bouquet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      ) as any}
    </div>
  )
}
