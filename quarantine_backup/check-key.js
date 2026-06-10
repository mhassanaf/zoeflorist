const https = require('https');

const key = 'VDeodCOUeff41587cccf8787NJuX86dO';

const options = {
  hostname: 'api.rajaongkir.com',
  path: '/starter/province',
  method: 'GET',
  headers: {
    key: key
  },
  timeout: 10000
};

console.log('Sending direct request to RajaOngkir...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (err) => {
  console.error('Fetch error:', err.message);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Request timed out (ISP block likely)');
});

req.end();
