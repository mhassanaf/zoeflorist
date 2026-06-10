'use server'

import https from 'https'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const QRISLY_API_KEY = process.env.QRISLY_API_KEY
const QRIS_ID = process.env.QRISLY_QRIS_ID
const BASE_URL = 'https://api-sandbox.collaborator.komerce.id/user/api/v1/qrisly'

// Helper to make HTTPS requests using native node https module
function makeRequest(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  bodyData?: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers,
      timeout: 15000,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`Status ${res.statusCode}: ${data}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Connection timeout'))
    })

    if (bodyData) {
      req.write(bodyData)
    }
    req.end()
  })
}

interface GenerateQRISResult {
  success: boolean
  qrisString?: string
  historyId?: number
  finalAmount?: number
  expiryTime?: string
  error?: string
}

// 1. Generate dynamic QRIS
export async function generateDynamicQRIS(orderId: string, amount: number): Promise<GenerateQRISResult> {
  try {
    if (!QRISLY_API_KEY || !QRIS_ID) {
      console.warn('QRISLY API Key or QRIS ID is not set in environment variables.')
      return { success: false, error: 'Konfigurasi pembayaran QRISLY belum lengkap.' }
    }

    const bodyData = JSON.stringify({
      qris_id: Number(QRIS_ID),
      amount: Math.round(amount),
      output_type: 'string',
      external_id: orderId
    })

    const data = await makeRequest(`${BASE_URL}/generate-qris`, 'POST', {
      'x-api-key': QRISLY_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(bodyData))
    }, bodyData)

    if (data?.meta?.status === 'success' && data?.data) {
      return {
        success: true,
        qrisString: data.data.qris_string,
        historyId: data.data.history_id,
        finalAmount: data.data.final_amount,
        expiryTime: data.data.expiry_time
      }
    }

    return { success: false, error: data?.meta?.message || 'Gagal membuat QRIS dinamis.' }
  } catch (error: any) {
    console.error('Error in generateDynamicQRIS:', error.message)
    return { success: false, error: error.message || 'Koneksi ke server pembayaran gagal.' }
  }
}

interface CheckPaymentStatusResult {
  success: boolean
  isPaid?: boolean
  status?: string
  error?: string
}

// 2. Check payment status and update Supabase database automatically if paid
export async function checkQRISPaymentStatus(orderId: string, historyId: number): Promise<CheckPaymentStatusResult> {
  try {
    if (!QRISLY_API_KEY) {
      return { success: false, error: 'Konfigurasi pembayaran QRISLY belum lengkap.' }
    }

    const data = await makeRequest(`${BASE_URL}/payment-status/${historyId}`, 'GET', {
      'x-api-key': QRISLY_API_KEY
    })

    if (data?.meta?.status === 'success' && data?.data) {
      const isPaid = data.data.payment_status === 'paid'

      if (isPaid) {
        // Update database order status to Paid
        const supabase = await createClient()
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'Paid',
            status: 'Processing'
          })
          .eq('id', orderId)

        if (updateError) {
          console.error('Failed to update order status in Supabase:', updateError.message)
          return { success: false, error: 'Pembayaran sukses di Komerce tapi gagal memperbarui data pesanan.' }
        }

        revalidatePath('/riwayat')
        revalidatePath('/admin/pesanan')
        revalidatePath('/admin/dashboard')
        return { success: true, isPaid: true, status: 'paid' }
      }

      return { success: true, isPaid: false, status: data.data.payment_status }
    }

    return { success: false, error: data?.meta?.message || 'Gagal mengecek status pembayaran.' }
  } catch (error: any) {
    console.error('Error in checkQRISPaymentStatus:', error.message)
    return { success: false, error: error.message || 'Koneksi ke server status pembayaran gagal.' }
  }
}
