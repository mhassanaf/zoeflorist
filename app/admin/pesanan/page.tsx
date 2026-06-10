import { getAdminOrders } from '@/app/actions/orders'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OrderManagementClient from './OrderManagementClient'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  let orders: any[] = []

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
    orders = await getAdminOrders()
  } catch (error) {
    console.error('Error fetching admin orders data:', error)
  }

  return <OrderManagementClient initialOrders={orders} />
}
