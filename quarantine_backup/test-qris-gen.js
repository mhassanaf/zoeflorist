const https = require('https');

const key = 'VDeodCOUeff41587cccf8787NJuX86dO';
const url = 'https://api-sandbox.collaborator.komerce.id/user/api/v1/qrisly/generate-qris';

const bodyData = JSON.stringify({
  qris_id: 18, // Dummy ID from docs
  amount: 10000,
  output_type: "string"
});

const parsedUrl = new URL(url);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname,
  method: 'POST',
  headers: {
    'x-api-key': key,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyData)
  },
  timeout: 10000
};

console.log('Sending request to Qrisly generate-qris...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Raw Response:', data);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.on('timeout', () => {
  req.destroy();
  console.error('Request timed out');
});

req.write(bodyData);
req.end();
