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

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'Pending',
      total_amount: totalAmount,
      shipping_name: shipping.shipping_name,
      shipping_phone: shipping.shipping_phone,
      shipping_address: shipping.shipping_address,
      payment_method: shipping.payment_method,
      shipping_fee: 0,
      shipping_courier: 'Pending',
    })
    .select()
    .single()

  if (orderError || !order) {
    return { error: `Gagal membuat pesanan: ${orderError?.message || 'Gagal menyimpan pesanan'}` }
  }

  // Insert order items
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

  // Get current order status to prevent double decrement
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('payment_status')
    .eq('id', orderId)
    .single()

  if (fetchError || !currentOrder) {
    return { error: 'Pesanan tidak ditemukan.' }
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

  // If approved and the previous status was not Paid, decrement stock!
  if (isApproved && currentOrder.payment_status !== 'Paid') {
    await decrementOrderStock(supabase, orderId)
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

  // Get current order status to prevent double decrement
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('payment_status')
    .eq('id', orderId)
    .single()

  if (fetchError || !currentOrder) {
    return { error: 'Pesanan tidak ditemukan.' }
  }

  const payload: any = {
    payment_status: paymentStatus,
  }

  if (adminMessage !== undefined) {
    payload.admin_message = adminMessage
  }

  if (paymentStatus === 'Paid') {
    const { data: currentOrderData } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (currentOrderData?.status === 'Pending') {
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

  // If changing to Paid and the previous status was not Paid, decrement stock!
  if (paymentStatus === 'Paid' && currentOrder.payment_status !== 'Paid') {
    await decrementOrderStock(supabase, orderId)
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

// Helper function to decrement product stock when payment is verified Paid
async function decrementOrderStock(supabase: any, orderId: string) {
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  if (itemsError || !items) {
    console.error('Error fetching order items for stock decrement:', itemsError)
    return
  }

  for (const item of items) {
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (fetchError || !currentProduct) {
      console.error(`Product not found for stock decrement: ${item.product_id}`)
      continue
    }

    const newStock = Math.max(0, currentProduct.stock - item.quantity)
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', item.product_id)

    if (updateError) {
      console.error(`Failed to update stock for product ${item.product_id}:`, updateError)
    }
  }
}

// Action for Admin to input shipping fee manually
export async function updateOrderShippingFee(orderId: string, shippingFee: number) {
  const supabase = await createClient()
  const isAdmin = await checkAdmin(supabase)

  if (!isAdmin) {
    return { error: 'Akses ditolak. Anda bukan admin.' }
  }

  // Get order items to recalculate total
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { error: 'Pesanan tidak ditemukan.' }
  }

  const productTotal = order.order_items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0)
  const finalTotalAmount = productTotal + shippingFee

  const { data, error } = await supabase
    .from('orders')
    .update({
      shipping_fee: shippingFee,
      shipping_courier: `Kirim:${shippingFee}`,
      total_amount: finalTotalAmount,
    })
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

// Action for User to choose delivery method (Kirim / Pickup)
export async function updateOrderDeliveryMethod(orderId: string, method: 'Kirim' | 'Pickup') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Silakan login terlebih dahulu.' }
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return { error: 'Pesanan tidak ditemukan.' }
  }

  const isAdmin = await checkAdmin(supabase)
  if (order.user_id !== user.id && !isAdmin) {
    return { error: 'Akses ditolak.' }
  }

  if (order.payment_status === 'Paid' || order.payment_status === 'Waiting Verification') {
    return { error: 'Metode pengiriman tidak dapat diubah setelah pembayaran diproses.' }
  }

  let originalFee = 0
  const courierString = order.shipping_courier || ''
  if (courierString.includes(':')) {
    const parts = courierString.split(':')
    originalFee = Number(parts[1]) || 0
  } else {
    originalFee = Number(order.shipping_fee) || 0
  }

  const productTotal = order.order_items.reduce((sum: number, item: any) => sum + (Number(item.price) * item.quantity), 0)

  let newShippingFee = 0
  let newTotalAmount = productTotal

  if (method === 'Kirim') {
    newShippingFee = originalFee
    newTotalAmount = productTotal + originalFee
  }

  const newCourier = `${method}:${originalFee}`

  const { data, error } = await supabase
    .from('orders')
    .update({
      shipping_fee: newShippingFee,
      shipping_courier: newCourier,
      total_amount: newTotalAmount,
    })
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

