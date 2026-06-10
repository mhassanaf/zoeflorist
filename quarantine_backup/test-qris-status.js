const https = require('https');

const key = '3Ey8CIeheff41587cccf8787DnCuaDjP'; // Real QRISLY key
const historyId = 2967; // Generated in previous step
const url = `https://api-sandbox.collaborator.komerce.id/user/api/v1/qrisly/payment-status/${historyId}`;

const parsedUrl = new URL(url);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname,
  method: 'GET',
  headers: {
    'x-api-key': key
  },
  timeout: 10000
};

console.log(`Sending GET request to check payment status of history_id ${historyId}...`);
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
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

req.end();
