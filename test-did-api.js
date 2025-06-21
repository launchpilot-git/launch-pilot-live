// Script to test D-ID API with a simple avatar generation
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.DID_API_KEY;

if (!apiKey) {
  console.error('DID_API_KEY not found in .env.local');
  process.exit(1);
}

// Simple test payload with a short script
const payload = {
  script: {
    type: "text",
    input: "This is a quick test of the D-ID API. If you can see this video, the API is working correctly.",
    provider: {
      type: "microsoft",
      voice_id: "en-US-JennyNeural"
    }
  },
  config: {
    fluent: true,
    pad_audio: 0,
  },
  source_url: "https://create-images-results.d-id.com/google-oauth2%7C112389944830955988983/upl_PJGQGZPPjnkQUQQYGpTwX/image.png"
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'api.d-id.com',
  path: '/talks',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(apiKey).toString('base64'),
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(responseData);
      console.log('D-ID API Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.id) {
        console.log(`\nSuccessfully created a new D-ID talk with ID: ${parsedData.id}`);
        console.log('This confirms that your D-ID API key is working correctly.');
        console.log('The avatar should be generated within 1-2 minutes.');
      }
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error testing D-ID API:', error);
});

req.write(data);
req.end();

console.log('Sending test request to D-ID API...');
