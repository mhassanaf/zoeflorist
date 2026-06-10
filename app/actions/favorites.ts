'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavorite(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Silakan login terlebih dahulu untuk menyimpan favorit.' }
  }

  // Check if already favorited
  const { data: existing, error: checkError } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (checkError) {
    return { error: checkError.message }
  }

  if (existing) {
    // Remove favorite
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)

    if (deleteError) return { error: deleteError.message }
    
    revalidatePath('/favorit')
    return { success: true, favorited: false }
  } else {
    // Add favorite
    const { error: insertError } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, product_id: productId })

    if (insertError) return { error: insertError.message }

    revalidatePath('/favorit')
    return { success: true, favorited: true }
  }
}

export async function getFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id, products(*, reviews(rating))')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching favorites:', error)
    return []
  }

  // Map elements to actual products list with mapped ratings
  return data
    ? data
        .map((fav: any) => {
          const product = fav.products
          if (!product) return null
          
          const ratings = product.reviews?.map((r: any) => r.rating) || []
          const total = ratings.reduce((sum: number, r: number) => sum + r, 0)
          const avgRating = ratings.length > 0 ? Number((total / ratings.length).toFixed(1)) : 0
          const reviewCount = ratings.length

          const { reviews, ...rest } = product
          return {
            ...rest,
            avg_rating: avgRating,
            review_count: reviewCount,
          }
        })
        .filter(Boolean)
    : []
}

export async function getFavoritesMap() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return {}

  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching favorites map:', error)
    return {}
  }

  const map: Record<string, boolean> = {}
  data?.forEach((fav: any) => {
    map[fav.product_id] = true
  })

  return map
}
