// Script to check recent D-ID talks
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.DID_API_KEY;

if (!apiKey) {
  console.error('DID_API_KEY not found in .env.local');
  process.exit(1);
}

const options = {
  hostname: 'api.d-id.com',
  path: '/talks',
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
      
      if (parsedData.talks && parsedData.talks.length > 0) {
        console.log(`Found ${parsedData.talks.length} recent D-ID talks:`);
        
        parsedData.talks.forEach((talk, index) => {
          console.log(`\n--- Talk ${index + 1} ---`);
          console.log(`ID: ${talk.id}`);
          console.log(`Status: ${talk.status}`);
          console.log(`Created: ${new Date(talk.created_at).toLocaleString()}`);
          
          if (talk.result_url) {
            console.log(`Video URL: ${talk.result_url}`);
          }
        });
      } else {
        console.log('No recent D-ID talks found.');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error checking D-ID talks:', error);
});

req.end();

console.log('Checking recent D-ID talks...');
