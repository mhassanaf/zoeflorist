'use server'

import https from 'https'

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY
const ORIGIN_CITY_ID = process.env.RAJAONGKIR_ORIGIN_CITY_ID
const BASE_URL = 'https://api.rajaongkir.com/starter'

export interface RajaOngkirProvince {
  province_id: string
  province: string
}

export interface RajaOngkirCity {
  city_id: string
  province_id: string
  province: string
  type: string
  city_name: string
  postal_code: string
}

export interface RajaOngkirCost {
  service: string
  description: string
  cost: Array<{
    value: number
    etd: string
    note: string
  }>
}

// Helper to make HTTPS requests using native node https module to bypass undici's 10s timeout
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
      timeout: 30000, // 30 seconds socket timeout
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
      reject(new Error('Connection timeout (30s)'))
    })

    if (bodyData) {
      req.write(bodyData)
    }
    req.end()
  })
}

// 1. Fetch all provinces
export async function getProvinces(): Promise<RajaOngkirProvince[]> {
  try {
    if (!RAJAONGKIR_API_KEY) {
      console.warn('RajaOngkir API Key is not set.')
      return []
    }

    const data = await makeRequest(`${BASE_URL}/province`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    return data?.rajaongkir?.results || []
  } catch (error) {
    console.error('Error fetching RajaOngkir provinces:', error)
    return []
  }
}

// 2. Fetch cities filtered by province
export async function getCities(provinceId: string): Promise<RajaOngkirCity[]> {
  try {
    if (!RAJAONGKIR_API_KEY) {
      console.warn('RajaOngkir API Key is not set.')
      return []
    }

    if (!provinceId) return []

    const data = await makeRequest(`${BASE_URL}/city?province=${provinceId}`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    return data?.rajaongkir?.results || []
  } catch (error) {
    console.error('Error fetching RajaOngkir cities:', error)
    return []
  }
}

// 3. Calculate shipping cost
export async function calculateShippingCost(
  destinationCityId: string,
  courier: string,
  weightGrams: number = 1000
): Promise<RajaOngkirCost[]> {
  try {
    if (!RAJAONGKIR_API_KEY || !ORIGIN_CITY_ID) {
      console.warn('RajaOngkir API Key or Origin City ID is not set.')
      return []
    }

    if (!destinationCityId || !courier) {
      return []
    }

    const bodyData = new URLSearchParams({
      origin: ORIGIN_CITY_ID,
      destination: destinationCityId,
      weight: weightGrams.toString(),
      courier: courier.toLowerCase(),
    }).toString()

    const data = await makeRequest(`${BASE_URL}/cost`, 'POST', {
      'key': RAJAONGKIR_API_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    }, bodyData)

    return data?.rajaongkir?.results[0]?.costs || []
  } catch (error) {
    console.error('Error calculating RajaOngkir shipping cost:', error)
    return []
  }
}
