import { getProducts } from '@/app/actions/products'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProductCrudClient from './ProductCrudClient'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  let products: any[] = []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  try {
    products = await getProducts()
  } catch (error) {
    console.error('Error fetching admin products data:', error)
  }

  return <ProductCrudClient initialProducts={products} />
}
