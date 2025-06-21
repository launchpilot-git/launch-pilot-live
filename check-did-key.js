// Script to check D-ID API key format and test authentication
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.DID_API_KEY;

if (!apiKey) {
  console.error('DID_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('Checking D-ID API key format...');
console.log(`API Key length: ${apiKey.length} characters`);
console.log(`First 5 characters: ${apiKey.substring(0, 5)}...`);
console.log(`Last 5 characters: ...${apiKey.substring(apiKey.length - 5)}`);

// Check if it looks like a Basic auth key (username:password format)
if (apiKey.includes(':')) {
  console.log('API key appears to be in username:password format (Basic auth)');
  const [username, password] = apiKey.split(':');
  console.log(`Username part: ${username}`);
  console.log(`Password part: ${password ? '(password present)' : '(no password)'}`);
} else {
  console.log('API key appears to be a simple token (not Basic auth format)');
}

// Fetch the .env.local file content to check how the key is defined
const fs = require('fs');
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const didKeyLine = envContent.split('\n').find(line => line.startsWith('DID_API_KEY='));
  
  if (didKeyLine) {
    console.log('\nAPI key definition in .env.local:');
    // Show the format but mask the actual key value
    const parts = didKeyLine.split('=');
    if (parts.length > 1) {
      const keyValue = parts[1].trim();
      const maskedKey = keyValue.substring(0, 5) + '...' + keyValue.substring(keyValue.length - 5);
      console.log(`DID_API_KEY=${maskedKey}`);
      
      // Check if it's properly quoted if it contains special characters
      if ((keyValue.includes(':') || keyValue.includes(' ')) && 
          !(keyValue.startsWith('"') && keyValue.endsWith('"')) &&
          !(keyValue.startsWith("'") && keyValue.endsWith("'"))) {
        console.log('WARNING: API key contains special characters but is not quoted in .env.local');
        console.log('This might cause parsing issues. Consider enclosing it in quotes.');
      }
    }
  } else {
    console.log('DID_API_KEY not found in .env.local file');
  }
} catch (error) {
  console.error('Error reading .env.local file:', error.message);
}
