'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface ShippingDetails {
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  payment_method: string
  shipping_fee?: number
  shipping_courier?: string
}

interface CartItem {
  id: string
  quantity: number
  price: number
}

export async function createOrder(shipping: ShippingDetails, items: CartItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Silakan login terlebih dahulu untuk melakukan checkout.' }
  }

  if (items.length === 0) {
    return { error: 'Keranjang belanja Anda kosong.' }
  }

  // Calculate total price and verify stock
  let totalAmount = 0
  for (const item of items) {
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, price, name')
      .eq('id', item.id)
      .single()

    if (fetchError || !product) {
      return { error: `Produk dengan ID ${item.id} tidak ditemukan.` }
    }

    if (product.stock < item.quantity) {
      return { error: `Stok bunga "${product.name}" tidak mencukupi. Tersedia: ${product.stock}, diminta: ${item.quantity}` }
    }

    totalAmount += Number(product.price) * item.quantity
  }

  const shippingFee = Number(shipping.shipping_fee) || 0
  const finalTotalAmount = totalAmount + shippingFee

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'Pending',
      total_amount: finalTotalAmount,
      shipping_name: shipping.shipping_name,
      shipping_phone: shipping.shipping_phone,
      shipping_address: shipping.shipping_address,
      payment_method: shipping.payment_method,
      shipping_fee: shippingFee,
      shipping_courier: shipping.shipping_courier || null,
    })
    .select()
    .single()

  if (orderError || !order) {
    return { error: `Gagal membuat pesanan: ${orderError?.message || 'Gagal menyimpan pesanan'}` }
  }

  // Insert order items & update product stock
  for (const item of items) {
    const { error: itemError } = await supabase.from('order_items').insert({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price,
    })

    if (itemError) {
      return { error: `Gagal menyimpan detail pesanan: ${itemError.message}` }
    }

    // Decrement stock
    const { data: currentProduct } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.id)
      .single()

    const newStock = Math.max(0, (currentProduct?.stock || 0) - item.quantity)
    await supabase.from('products').update({ stock: newStock }).eq('id', item.id)
  }

  revalidatePath('/riwayat')
  revalidatePath('/admin/pesanan')
  revalidatePath('/admin/dashboard')
  
  return { success: true, orderId: order.id }
}

export async function getUserOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user orders:', error)
    return []
  }

  return data || []
}

// Admin Operations
async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function getAdminOrders() {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    throw new Error('Akses ditolak.')
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(name, email), order_items(*, products(*))')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin orders:', error)
    return []
  }

  return data || []
}

export async function updateOrderStatus(orderId: string, status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled') {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/riwayat')
  revalidatePath('/admin/pesanan')
  revalidatePath('/admin/dashboard')
  
  return { success: true, data }
}

// Dashboard statistics helper
export async function getDashboardStats() {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak.' }
  }

  // Fetch count of users, products, orders
  const { data: orders } = await supabase.from('orders').select('total_amount, status')
  const { count: customerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user')
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })

  const totalSales = orders
    ?.filter((o: any) => o.status !== 'Cancelled')
    ?.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0

  const activeOrdersCount = orders?.filter((o: any) => o.status === 'Pending' || o.status === 'Processing').length || 0

  return {
    totalSales,
    customerCount: customerCount || 0,
    productCount: productCount || 0,
    activeOrdersCount,
  }
}

export async function submitPaymentProof(orderId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Silakan login terlebih dahulu.' }
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return { error: 'Tidak ada berkas bukti transfer yang dikirimkan.' }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${orderId}_${Date.now()}.${fileExt}`
    const filePath = fileName

    const { data, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type,
        duplex: 'half',
      })

    if (uploadError) {
      console.error('Receipt upload error:', uploadError)
      return { error: uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath)

    const { data: updatedData, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_proof_url: publicUrl,
        payment_status: 'Waiting Verification',
      })
      .eq('id', orderId)
      .eq('user_id', user.id)
      .select()

    if (updateError) {
      return { error: updateError.message }
    }

    if (!updatedData || updatedData.length === 0) {
      return { error: 'Gagal memperbarui data pembayaran di database. Pastikan kebijakan RLS (Row Level Security) tabel orders telah dikonfigurasi.' }
    }

    revalidatePath('/riwayat')
    revalidatePath('/admin/pesanan')
    revalidatePath('/admin/dashboard')

    return { success: true, url: publicUrl }
  } catch (err: any) {
    console.error('Payment proof upload catch error:', err)
    return { error: err.message || 'Gagal mengunggah bukti pembayaran.' }
  }
}

export async function verifyPayment(orderId: string, isApproved: boolean, adminMessage?: string) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const payload: any = {
    payment_status: isApproved ? 'Paid' : 'Rejected',
    admin_message: adminMessage || null,
  }

  if (isApproved) {
    payload.status = 'Processing'
  }

  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/riwayat')
  revalidatePath('/admin/pesanan')
  revalidatePath('/admin/dashboard')

  return { success: true, data }
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: 'Unpaid' | 'Waiting Verification' | 'Paid' | 'Rejected',
  adminMessage?: string
) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const payload: any = {
    payment_status: paymentStatus,
  }

  if (adminMessage !== undefined) {
    payload.admin_message = adminMessage
  }

  if (paymentStatus === 'Paid') {
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (currentOrder?.status === 'Pending') {
      payload.status = 'Processing'
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/riwayat')
  revalidatePath('/admin/pesanan')
  revalidatePath('/admin/dashboard')

  return { success: true, data }
}

export async function sendAdminMessage(orderId: string, message: string) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ admin_message: message || null })
    .eq('id', orderId)
    .select()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/riwayat')
  revalidatePath('/admin/pesanan')
  revalidatePath('/admin/dashboard')

  return { success: true, data }
}

