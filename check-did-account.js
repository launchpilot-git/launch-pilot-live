// Script to check D-ID account information
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.DID_API_KEY;

if (!apiKey) {
  console.error('DID_API_KEY not found in .env.local');
  process.exit(1);
}

const options = {
  hostname: 'api.d-id.com',
  path: '/account',
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(apiKey).toString('base64')
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('Account Information:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Check if there's credit information
      if (parsedData.credits !== undefined) {
        console.log(`\nRemaining Credits: ${parsedData.credits}`);
      }
      
      // Check if there's plan information
      if (parsedData.plan) {
        console.log(`Plan: ${parsedData.plan}`);
      }
      
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error checking D-ID account:', error);
});

req.end();

console.log('Checking D-ID account information...');
