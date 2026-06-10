'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrUpdateReview(productId: string, rating: number, comment: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Silakan login terlebih dahulu.' }
  }

  if (rating < 1 || rating > 5) {
    return { error: 'Rating harus bernilai antara 1 sampai 5.' }
  }

  // Verify if user has a completed order containing this product
  const { data: purchaseItems, error: purchaseError } = await supabase
    .from('order_items')
    .select('id, order_id, orders!inner(user_id, status)')
    .eq('product_id', productId)
    .eq('orders.user_id', user.id)
    .eq('orders.status', 'Completed')
    .limit(1)

  if (purchaseError) {
    console.error('Error verifying product purchase:', purchaseError)
    return { error: 'Gagal memverifikasi pembelian produk.' }
  }

  if (!purchaseItems || purchaseItems.length === 0) {
    return { error: 'Anda hanya dapat memberikan ulasan untuk produk yang telah Anda beli dan pesanannya sudah selesai.' }
  }

  // Upsert the review
  const { error: upsertError } = await supabase
    .from('reviews')
    .upsert({
      user_id: user.id,
      product_id: productId,
      rating,
      comment,
    }, {
      onConflict: 'user_id, product_id'
    })

  if (upsertError) {
    return { error: `Gagal menyimpan ulasan: ${upsertError.message}` }
  }

  // Revalidate cache paths
  revalidatePath('/katalog')
  revalidatePath('/riwayat')
  revalidatePath('/admin/dashboard')

  return { success: true }
}

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function deleteReviewAdmin(reviewId: string) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) {
    return { error: `Gagal menghapus ulasan: ${error.message}` }
  }

  revalidatePath('/katalog')
  revalidatePath('/admin/dashboard')

  return { success: true }
}
