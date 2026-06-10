import { getProducts } from '@/app/actions/products'
import { getFavoritesMap } from '@/app/actions/favorites'
import { createClient } from '@/utils/supabase/server'
import CatalogClient from './CatalogClient'

export const dynamic = 'force-dynamic'

export default async function KatalogPage() {
  let products: any[] = []
  let favoritesMap: Record<string, boolean> = {}
  let isLoggedIn = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = !!user

    products = await getProducts()
    
    if (isLoggedIn) {
      favoritesMap = await getFavoritesMap()
    }
  } catch (error) {
    console.error('Error fetching catalog data:', error)
  }

  return (
    <CatalogClient
      initialProducts={products}
      favoritesMap={favoritesMap}
      isLoggedIn={isLoggedIn}
    />
  )
}
