import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CheckoutClient from './CheckoutClient'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  let user = null

  try {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    user = currentUser
  } catch (error) {
    console.error('Error fetching auth state for checkout:', error)
  }

  // Force authentication outside try-catch
  if (!user) {
    redirect('/login?error=Silakan login terlebih dahulu untuk melakukan checkout.')
  }

  return <CheckoutClient isLoggedIn={true} />
}
