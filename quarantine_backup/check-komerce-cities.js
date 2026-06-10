const https = require('https');

const key = 'VDeodCOUeff41587cccf8787NJuX86dO';
const baseUrl = 'https://rajaongkir.komerce.id/api/v1';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { key: key } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Fetching provinces from Komerce...');
    const provincesData = await makeRequest(`${baseUrl}/destination/province`);
    console.log('Provinces Meta:', provincesData.meta);
    console.log('Provinces Sample:', provincesData.data ? provincesData.data.slice(0, 3) : 'No data');

    // Find West Java (Jawa Barat) province id
    const jabar = provincesData.data.find(p => p.name.toLowerCase().includes('jawa barat'));
    console.log('Jawa Barat Province:', jabar);

    if (jabar) {
      console.log(`Fetching cities for Province ID ${jabar.id}...`);
      const citiesData = await makeRequest(`${baseUrl}/destination/city/${jabar.id}`);
      console.log('Cities Meta:', citiesData.meta);
      const bandungCities = citiesData.data.filter(c => c.name.toLowerCase().includes('bandung'));
      console.log('Bandung Cities in Komerce:', bandungCities);
    }
  } catch (error) {
    console.error('Error in script:', error);
  }
}

run();
