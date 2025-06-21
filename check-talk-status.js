// Simple script to check the status of a D-ID talk
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const talkId = 'tlk_OaET7exJMW3xAe6swEQi4';
const apiKey = process.env.DID_API_KEY;

if (!apiKey) {
  console.error('DID_API_KEY not found in .env.local');
  process.exit(1);
}

const options = {
  hostname: 'api.d-id.com',
  path: `/talks/${talkId}`,
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
      console.log('Talk Status:', parsedData);
      
      if (parsedData.status === 'done' && parsedData.result_url) {
        console.log('\nVideo is ready! URL:', parsedData.result_url);
      } else if (parsedData.status === 'error') {
        console.log('\nError generating video:', parsedData.error);
      } else {
        console.log('\nVideo is still processing. Current status:', parsedData.status);
        console.log('Please check again in a few minutes.');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error checking talk status:', error);
});

req.end();

console.log(`Checking status of talk: ${talkId}...`);
