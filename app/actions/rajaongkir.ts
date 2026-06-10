'use server'

import https from 'https'

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY
const ORIGIN_CITY_ID = process.env.RAJAONGKIR_ORIGIN_CITY_ID
const BASE_URL = 'https://rajaongkir.komerce.id/api/v1'

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

// Memoized origin city ID to avoid redundant API queries
let memoizedOriginCityId: string | null = null

async function getKomerceOriginCityId(): Promise<string | null> {
  if (memoizedOriginCityId) return memoizedOriginCityId

  // If the user configured a custom ID that is not the default 22, use it directly
  if (ORIGIN_CITY_ID && ORIGIN_CITY_ID !== '22') {
    memoizedOriginCityId = ORIGIN_CITY_ID
    return memoizedOriginCityId
  }

  // Otherwise, if it is 22 (Bandung) or not set, dynamically search for the new ID in Komerce
  try {
    if (!RAJAONGKIR_API_KEY) return ORIGIN_CITY_ID || null

    console.log('Resolving Komerce ID for Jawa Barat...')
    // 1. Fetch provinces to find Jawa Barat
    const provData = await makeRequest(`${BASE_URL}/destination/province`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const provinces = provData?.data || []
    const jabar = provinces.find((p: any) => p.name && p.name.toLowerCase().includes('jawa barat'))
    if (!jabar) {
      console.warn('Jawa Barat province not found in Komerce, using default origin city ID')
      return ORIGIN_CITY_ID || null
    }

    console.log(`Resolving Komerce ID for Kabupaten Bandung in Jawa Barat (Province ID ${jabar.id})...`)
    // 2. Fetch cities in Jawa Barat to find Kabupaten Bandung
    const cityData = await makeRequest(`${BASE_URL}/destination/city/${jabar.id}`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const cities = cityData?.data || []
    const kabBandung = cities.find((c: any) => 
      c.name && c.name.toLowerCase().includes('bandung') && 
      c.type && c.type.toLowerCase().includes('kabupaten')
    )
    if (kabBandung) {
      memoizedOriginCityId = String(kabBandung.id)
      console.log('Dynamically resolved Komerce Origin City ID for Kabupaten Bandung:', memoizedOriginCityId)
      return memoizedOriginCityId
    }
  } catch (err) {
    console.error('Failed to dynamically resolve Komerce Origin City ID:', err)
  }

  // Fallback to whatever is in env
  return ORIGIN_CITY_ID || null
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

    const data = await makeRequest(`${BASE_URL}/destination/province`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const results = data?.data || []
    return results.map((item: any) => ({
      province_id: String(item.id),
      province: item.name,
    }))
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

    const data = await makeRequest(`${BASE_URL}/destination/city/${provinceId}`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const results = data?.data || []
    return results.map((item: any) => ({
      city_id: String(item.id),
      province_id: String(item.province_id),
      province: '',
      type: item.type || '',
      city_name: item.name,
      postal_code: item.postal_code || '',
    }))
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
    if (!RAJAONGKIR_API_KEY) {
      console.warn('RajaOngkir API Key is not set.')
      return []
    }

    if (!destinationCityId || !courier) {
      return []
    }

    const resolvedOriginId = await getKomerceOriginCityId()
    if (!resolvedOriginId) {
      console.warn('Origin City ID could not be resolved.')
      return []
    }

    const bodyData = new URLSearchParams({
      origin: resolvedOriginId,
      destination: destinationCityId,
      weight: weightGrams.toString(),
      courier: courier.toLowerCase(),
    }).toString()

    const data = await makeRequest(`${BASE_URL}/calculate/domestic-cost`, 'POST', {
      'key': RAJAONGKIR_API_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    }, bodyData)

    return data?.data?.results[0]?.costs || []
  } catch (error) {
    console.error('Error calculating RajaOngkir shipping cost:', error)
    return []
  }
}
