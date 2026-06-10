import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CartClient from './CartClient'

export const dynamic = 'force-dynamic'

export default async function KeranjangPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?error=Silakan login terlebih dahulu untuk melihat keranjang belanja Anda.')
    }
  } catch (error) {
    // Rethrow redirect error if caught
    throw error
  }

  return <CartClient />
}
