// Script to check a specific D-ID talk
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.DID_API_KEY;
const talkId = 'tlk_9eDAXwzwLhHRyNJZntpJ4'; // The ID from the new job

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
      const talk = JSON.parse(data);
      
      console.log('--- Talk Details ---');
      console.log(`ID: ${talk.id}`);
      console.log(`Status: ${talk.status}`);
      console.log(`Created: ${new Date(talk.created_at).toLocaleString()}`);
      
      if (talk.result_url) {
        console.log(`Video URL: ${talk.result_url}`);
      }
      
      if (talk.status === 'created' || talk.status === 'started') {
        console.log('\nThe avatar is still being generated. This process typically takes 1-2 minutes.');
      } else if (talk.status === 'done') {
        console.log('\nThe avatar generation is complete!');
      } else if (talk.status === 'error') {
        console.log('\nThere was an error generating the avatar.');
        if (talk.error) {
          console.log(`Error details: ${talk.error}`);
        }
      }
      
      // Print full response for debugging
      console.log('\nFull API Response:');
      console.log(JSON.stringify(talk, null, 2));
      
    } catch (e) {
      console.error('Error parsing response:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error checking D-ID talk:', error);
});

req.end();

console.log(`Checking status of D-ID talk: ${talkId}...`);
