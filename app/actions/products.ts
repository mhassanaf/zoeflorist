'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const seedProducts = [
  {
    name: 'Rosé Romance Bouquet',
    description: 'Rangkaian bunga mawar pink pastel premium yang dipadukan dengan daun eucalyptus segar, dibungkus rapi dengan kertas kraft cokelat premium.',
    price: 450000,
    size: 'Sedang',
    color: 'Merah Muda',
    stock: 15,
    image_url: '/products/rose_romance.png',
    is_active: true
  },
  {
    name: 'Crimson Elegance Bouquet',
    description: 'Rangkaian mewah bunga mawar beludru merah tua yang dipadukan dengan daun-daunan gelap eksotis, menciptakan kesan romantis yang mendalam.',
    price: 750000,
    size: 'Besar',
    color: 'Merah',
    stock: 8,
    image_url: '/products/crimson_elegance.png',
    is_active: true
  },
  {
    name: 'Vanilla Pastels Bouquet',
    description: 'Rangkaian bunga tulip putih murni, bunga lili wangi, dan anyelir krem lembut yang dibungkus dengan kain linen halus, memberikan kesan damai dan elegan.',
    price: 380000,
    size: 'Sedang',
    color: 'Putih',
    stock: 20,
    image_url: '/products/vanilla_pastels.png',
    is_active: true
  },
  {
    name: 'Golden Dawn Bouquet',
    description: 'Kombinasi ceria bunga matahari kuning cerah dan bunga chamomile kecil yang manis, dibungkus dengan kertas kraft kuning madu.',
    price: 250000,
    size: 'Kecil',
    color: 'Kuning',
    stock: 10,
    image_url: '/products/golden_dawn.png',
    is_active: true
  }
]

async function seedDatabaseIfEmpty(supabase: any) {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (!error && count === 0) {
      await supabase.from('products').insert(seedProducts)
    }
  } catch (err) {
    console.error('Failed to seed database:', err)
  }
}

export async function getProducts(options?: {
  search?: string
  size?: string
  color?: string
  sortBy?: 'price_asc' | 'price_desc' | 'newest'
}) {
  const supabase = await createClient()
  
  // Seed database if it's empty
  await seedDatabaseIfEmpty(supabase)

  let query = supabase.from('products').select('*, reviews(rating)')

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  if (options?.size && options.size !== 'Semua') {
    query = query.eq('size', options.size)
  }

  if (options?.color && options.color !== 'Semua') {
    query = query.eq('color', options.color)
  }

  // Sorting
  if (options?.sortBy === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (options?.sortBy === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  const productsWithRatings = (data || []).map((product: any) => {
    const ratings = product.reviews?.map((r: any) => r.rating) || []
    const total = ratings.reduce((sum: number, r: number) => sum + r, 0)
    const avgRating = ratings.length > 0 ? Number((total / ratings.length).toFixed(1)) : 0
    const reviewCount = ratings.length

    const { reviews, ...rest } = product
    return {
      ...rest,
      avg_rating: avgRating,
      review_count: reviewCount
    }
  })

  return productsWithRatings
}

export async function getProductById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('*, reviews(rating)').eq('id', id).single()

  if (error) {
    console.error('Error fetching product by ID:', error)
    return null
  }

  const ratings = data.reviews?.map((r: any) => r.rating) || []
  const total = ratings.reduce((sum: number, r: number) => sum + r, 0)
  const avgRating = ratings.length > 0 ? Number((total / ratings.length).toFixed(1)) : 0
  const reviewCount = ratings.length

  const { reviews, ...rest } = data
  return {
    ...rest,
    avg_rating: avgRating,
    review_count: reviewCount
  }
}

// Admin role check helper
async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function createProduct(product: {
  name: string
  description: string
  price: number
  size: 'Kecil' | 'Sedang' | 'Besar'
  color: string
  stock: number
  image_url: string
  is_active: boolean
}) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)
  
  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { data, error } = await supabase.from('products').insert([product]).select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/katalog')
  revalidatePath('/admin/produk')
  return { success: true, data }
}

export async function updateProduct(
  id: string,
  product: {
    name: string
    description: string
    price: number
    size: 'Kecil' | 'Sedang' | 'Besar'
    color: string
    stock: number
    image_url: string
    is_active: boolean
  }
) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)
  
  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/katalog')
  revalidatePath('/admin/produk')
  return { success: true, data }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)
  
  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/katalog')
  revalidatePath('/admin/produk')
  return { success: true }
}

export async function uploadProductImage(formData: FormData) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)
  
  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: 'Tidak ada berkas gambar yang dikirimkan.' }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const filePath = fileName

    const { data, error } = await supabase.storage
      .from('products')
      .upload(filePath, buffer, {
        contentType: file.type,
        duplex: 'half',
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(filePath)

    return { success: true, url: publicUrl }
  } catch (err: any) {
    console.error('Upload catch error:', err)
    return { error: err.message || 'Gagal mengunggah gambar.' }
  }
}

