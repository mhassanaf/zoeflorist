const https = require('https');

const key = 'VDeodCOUeff41587cccf8787NJuX86dO';
const baseUrl = 'https://rajaongkir.komerce.id/api/v1';

function makeRequest(url, method = 'GET', headers = {}, bodyData = '') {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        key: key,
        ...headers
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function run() {
  try {
    console.log('1. Fetching cities in DKI Jakarta (Province 10)...');
    const dkiCities = await makeRequest(`${baseUrl}/destination/city/10`);
    const cities = dkiCities.body.data || [];
    console.log('DKI Jakarta Cities:', cities);

    const jakPus = cities.find(c => c.name.toLowerCase().includes('pusat'));
    console.log('Found Jakarta Pusat:', jakPus);

    if (jakPus) {
      console.log('\n2. Calculating cost from Bandung (55) to Jakarta Pusat (ID: ' + jakPus.id + ')');
      const bodyData = new URLSearchParams({
        origin: '55',
        destination: String(jakPus.id),
        weight: '1000',
        courier: 'jne'
      }).toString();

      const costResult = await makeRequest(
        `${baseUrl}/calculate/domestic-cost`,
        'POST',
        { 'content-type': 'application/x-www-form-urlencoded' },
        bodyData
      );

      console.log('Response Status:', costResult.status);
      console.log('Response Body:', JSON.stringify(costResult.body, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
