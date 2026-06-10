'use server'

import https from 'https'

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY
const ORIGIN_CITY_ID = process.env.RAJAONGKIR_ORIGIN_CITY_ID

// Base URLs
const DIRECT_BASE_URL = 'https://api.rajaongkir.com/starter'
const KOMERCE_BASE_URL = 'https://rajaongkir.komerce.id/api/v1'

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

// Track active API source dynamically (direct, komerce, or mock)
let activeSource: 'direct' | 'komerce' | 'mock' = 'direct'

// Memoized origin city ID to avoid redundant API queries for Komerce
let memoizedOriginCityId: string | null = null

// Fallback Mock Data
const MOCK_PROVINCES: RajaOngkirProvince[] = [
  { province_id: '9', province: 'Jawa Barat (Offline Mode)' },
  { province_id: '6', province: 'DKI Jakarta (Offline Mode)' },
  { province_id: '10', province: 'Jawa Tengah (Offline Mode)' },
  { province_id: '11', province: 'Jawa Timur (Offline Mode)' },
  { province_id: '5', province: 'DI Yogyakarta (Offline Mode)' },
  { province_id: '3', province: 'Banten (Offline Mode)' }
]

const MOCK_WEST_JAVA_CITIES: RajaOngkirCity[] = [
  { city_id: '22', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bandung', postal_code: '40111' },
  { city_id: '23', province_id: '9', province: 'Jawa Barat', type: 'Kabupaten', city_name: 'Bandung', postal_code: '40311' },
  { city_id: '54', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bekasi', postal_code: '17111' },
  { city_id: '55', province_id: '9', province: 'Jawa Barat', type: 'Kabupaten', city_name: 'Bekasi', postal_code: '17510' },
  { city_id: '78', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Bogor', postal_code: '16111' },
  { city_id: '115', province_id: '9', province: 'Jawa Barat', type: 'Kota', city_name: 'Depok', postal_code: '16411' }
]

const MOCK_JAKARTA_CITIES: RajaOngkirCity[] = [
  { city_id: '151', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Barat', postal_code: '11110' },
  { city_id: '152', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Pusat', postal_code: '10110' },
  { city_id: '153', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Selatan', postal_code: '12110' },
  { city_id: '154', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Timur', postal_code: '13110' },
  { city_id: '155', province_id: '6', province: 'DKI Jakarta', type: 'Kota', city_name: 'Jakarta Utara', postal_code: '14110' }
]

const MOCK_JATENG_CITIES: RajaOngkirCity[] = [
  { city_id: '399', province_id: '10', province: 'Jawa Tengah', type: 'Kota', city_name: 'Semarang', postal_code: '50111' },
  { city_id: '445', province_id: '10', province: 'Jawa Tengah', type: 'Kota', city_name: 'Surakarta (Solo)', postal_code: '57111' }
]

const MOCK_JATIM_CITIES: RajaOngkirCity[] = [
  { city_id: '444', province_id: '11', province: 'Jawa Timur', type: 'Kota', city_name: 'Surabaya', postal_code: '60111' },
  { city_id: '255', province_id: '11', province: 'Jawa Timur', type: 'Kota', city_name: 'Malang', postal_code: '65111' }
]

const MOCK_DIY_CITIES: RajaOngkirCity[] = [
  { city_id: '501', province_id: '5', province: 'DI Yogyakarta', type: 'Kota', city_name: 'Yogyakarta', postal_code: '55111' },
  { city_id: '419', province_id: '5', province: 'DI Yogyakarta', type: 'Kabupaten', city_name: 'Sleman', postal_code: '55511' }
]

const MOCK_BANTEN_CITIES: RajaOngkirCity[] = [
  { city_id: '457', province_id: '3', province: 'Banten', type: 'Kota', city_name: 'Tangerang', postal_code: '15111' },
  { city_id: '455', province_id: '3', province: 'Banten', type: 'Kota', city_name: 'Tangerang Selatan', postal_code: '15310' }
]

const MOCK_CITIES: Record<string, RajaOngkirCity[]> = {
  '9': MOCK_WEST_JAVA_CITIES,
  '5': MOCK_WEST_JAVA_CITIES, // Komerce id mapping
  '6': MOCK_JAKARTA_CITIES,
  '4': MOCK_JAKARTA_CITIES,   // Komerce id mapping
  '10': MOCK_JATENG_CITIES,
  '11': MOCK_JATIM_CITIES,
  '5_diy': MOCK_DIY_CITIES,
  '3': MOCK_BANTEN_CITIES,
  '2': MOCK_BANTEN_CITIES    // Komerce id mapping
}

async function getKomerceOriginCityId(): Promise<string | null> {
  if (memoizedOriginCityId) return memoizedOriginCityId

  // If the user configured a custom ID that is not the default 22, use it directly
  if (ORIGIN_CITY_ID && ORIGIN_CITY_ID !== '22') {
    memoizedOriginCityId = ORIGIN_CITY_ID
    return memoizedOriginCityId
  }

  try {
    if (!RAJAONGKIR_API_KEY) return ORIGIN_CITY_ID || null

    console.log('Resolving Komerce ID for Jawa Barat...')
    const provData = await makeRequest(`${KOMERCE_BASE_URL}/destination/province`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const provinces = provData?.data || []
    const jabar = provinces.find((p: any) => p.name && p.name.toLowerCase().includes('jawa barat'))
    if (!jabar) {
      return ORIGIN_CITY_ID || null
    }

    const cityData = await makeRequest(`${KOMERCE_BASE_URL}/destination/city/${jabar.id}`, 'GET', {
      key: RAJAONGKIR_API_KEY,
    })
    const cities = cityData?.data || []
    const bandung = cities.find((c: any) => 
      c.name && c.name.toLowerCase() === 'bandung'
    )
    if (bandung) {
      memoizedOriginCityId = String(bandung.id)
      return memoizedOriginCityId
    }
  } catch (err) {
    console.error('Failed to resolve Komerce Origin City ID:', err)
  }

  return ORIGIN_CITY_ID || null
}

// Helper to make HTTPS requests using native node https module to bypass socket timeout
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
      timeout: 10000, // 10 seconds timeout
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

// 1. Fetch all provinces (with automatic fallbacks)
export async function getProvinces(): Promise<RajaOngkirProvince[]> {
  if (!RAJAONGKIR_API_KEY) {
    console.warn('RajaOngkir API Key is not set. Using offline mode.')
    activeSource = 'mock'
    return MOCK_PROVINCES
  }

  // Path A: Try standard direct RajaOngkir (e.g. running on Vercel)
  try {
    console.log('Attempting standard direct RajaOngkir fetch...')
    const data = await makeRequest(`${DIRECT_BASE_URL}/province`, 'GET', {
      key: RAJAONGKIR_API_KEY
    })
    
    if (data?.rajaongkir?.results) {
      activeSource = 'direct'
      console.log('Successfully connected to standard direct RajaOngkir!')
      return data.rajaongkir.results.map((item: any) => ({
        province_id: String(item.province_id),
        province: item.province
      }))
    }
  } catch (error: any) {
    console.warn(`Direct RajaOngkir failed: ${error.message}. Trying Komerce proxy...`)
  }

  // Path B: Try Komerce proxy (bypasses local ISP blocks)
  try {
    const data = await makeRequest(`${KOMERCE_BASE_URL}/destination/province`, 'GET', {
      key: RAJAONGKIR_API_KEY
    })

    if (data?.meta?.status === 'success' && data?.data) {
      activeSource = 'komerce'
      console.log('Successfully connected to Komerce shipping proxy!')
      return data.data.map((item: any) => ({
        province_id: String(item.id),
        province: item.name
      }))
    } else {
      console.warn('Komerce proxy returned error status:', data?.meta)
    }
  } catch (error: any) {
    console.warn(`Komerce proxy failed: ${error.message}. Falling back to offline mode.`)
  }

  // Path C: Fallback to Mock Data (graceful offline degradation)
  console.log('Using static mock provinces fallback.')
  activeSource = 'mock'
  return MOCK_PROVINCES
}

// 2. Fetch cities filtered by province
export async function getCities(provinceId: string): Promise<RajaOngkirCity[]> {
  if (!provinceId) return []

  if (activeSource === 'mock') {
    return MOCK_CITIES[provinceId] || MOCK_CITIES['5'] || []
  }

  // Direct RajaOngkir Path
  if (activeSource === 'direct') {
    try {
      const data = await makeRequest(`${DIRECT_BASE_URL}/city?province=${provinceId}`, 'GET', {
        key: RAJAONGKIR_API_KEY!
      })
      if (data?.rajaongkir?.results) {
        return data.rajaongkir.results.map((item: any) => ({
          city_id: String(item.city_id),
          province_id: String(item.province_id),
          province: item.province,
          type: item.type || '',
          city_name: item.city_name,
          postal_code: item.postal_code || ''
        }))
      }
    } catch (error: any) {
      console.warn('Direct getCities failed, falling back to mock:', error.message)
    }
  }

  // Komerce Proxy Path
  if (activeSource === 'komerce') {
    try {
      const data = await makeRequest(`${KOMERCE_BASE_URL}/destination/city/${provinceId}`, 'GET', {
        key: RAJAONGKIR_API_KEY!
      })
      if (data?.meta?.status === 'success' && data?.data) {
        return data.data.map((item: any) => ({
          city_id: String(item.id),
          province_id: String(item.province_id),
          province: '',
          type: item.type || '',
          city_name: item.name,
          postal_code: item.postal_code || ''
        }))
      }
    } catch (error: any) {
      console.warn('Komerce getCities failed, falling back to mock:', error.message)
    }
  }

  // Fallback to mock data if activeSource failed
  const mockKey = provinceId === '5' && activeSource === 'direct' ? '5_diy' : provinceId
  return MOCK_CITIES[mockKey] || []
}

// 3. Calculate shipping cost
export async function calculateShippingCost(
  destinationCityId: string,
  courier: string,
  weightGrams: number = 1000
): Promise<RajaOngkirCost[]> {
  const defaultFallback: RajaOngkirCost[] = [
    {
      service: 'REG',
      description: 'Layanan Pengiriman Flat / Standar',
      cost: [
        {
          value: 15000,
          etd: '2-4 Hari',
          note: 'Tarif Flat Fallback Sistem'
        }
      ]
    }
  ]

  if (activeSource === 'mock' || !RAJAONGKIR_API_KEY) {
    return defaultFallback
  }

  // Direct RajaOngkir Path
  if (activeSource === 'direct') {
    try {
      const bodyData = new URLSearchParams({
        origin: ORIGIN_CITY_ID || '22', // Standard Bandung ID
        destination: destinationCityId,
        weight: weightGrams.toString(),
        courier: courier.toLowerCase()
      }).toString()

      const data = await makeRequest(`${DIRECT_BASE_URL}/cost`, 'POST', {
        'key': RAJAONGKIR_API_KEY,
        'content-type': 'application/x-www-form-urlencoded'
      }, bodyData)

      const costs = data?.rajaongkir?.results?.[0]?.costs || []
      if (costs.length > 0) {
        return costs.map((item: any) => ({
          service: item.service,
          description: item.description || '',
          cost: item.cost.map((c: any) => ({
            value: Number(c.value),
            etd: c.etd || '',
            note: c.note || ''
          }))
        }))
      }
    } catch (error: any) {
      console.warn('Direct calculateShippingCost failed:', error.message)
    }
  }

  // Komerce Proxy Path
  if (activeSource === 'komerce') {
    try {
      const resolvedOriginId = await getKomerceOriginCityId()
      if (resolvedOriginId) {
        const bodyData = new URLSearchParams({
          origin: resolvedOriginId,
          destination: destinationCityId,
          weight: weightGrams.toString(),
          courier: courier.toLowerCase()
        }).toString()

        const data = await makeRequest(`${KOMERCE_BASE_URL}/calculate/domestic-cost`, 'POST', {
          'key': RAJAONGKIR_API_KEY,
          'content-type': 'application/x-www-form-urlencoded'
        }, bodyData)

        const results = data?.data || []
        if (results.length > 0) {
          return results.map((item: any) => ({
            service: item.service,
            description: item.description || item.name || '',
            cost: [
              {
                value: Number(item.cost),
                etd: item.etd || '',
                note: ''
              }
            ]
          }))
        }
      }
    } catch (error: any) {
      console.warn('Komerce calculateShippingCost failed:', error.message)
    }
  }

  // If everything fails, return flat rate fallback
  return defaultFallback
}
