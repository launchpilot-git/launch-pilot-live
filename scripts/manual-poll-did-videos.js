#!/usr/bin/env node

/**
 * Manual script to poll for DID video updates
 * Run this to immediately check all pending videos
 * 
 * Usage: node scripts/manual-poll-did-videos.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Get base URL from environment or use default localhost
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

async function pollDIDVideos() {
  console.log(`[${new Date().toISOString()}] Manually polling for DID video updates...`);
  
  try {
    const url = new URL('/api/poll-did-videos', BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = protocol.request(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data);
              console.log(`[${new Date().toISOString()}] Poll results:`, JSON.stringify(result, null, 2));
              
              if (result.results) {
                console.log('\nDetailed results:');
                result.results.forEach((r) => {
                  console.log(`- Job ${r.jobId}: ${r.status}`);
                  if (r.videoUrl) console.log(`  Video URL: ${r.videoUrl}`);
                  if (r.error) console.log(`  Error: ${r.error}`);
                });
              }
              
              console.log(`\nSummary:`);
              console.log(`- Updated: ${result.updated || 0} videos`);
              console.log(`- Processing: ${result.processing || 0} videos`);
              console.log(`- Errors: ${result.errors || 0} videos`);
              
              resolve(result);
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Error parsing response:`, error);
              console.error('Raw response:', data);
              reject(error);
            }
          } else {
            console.error(`[${new Date().toISOString()}] Error status code:`, res.statusCode);
            console.error('Response:', data);
            reject(new Error(`HTTP Error: ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Request error:`, error);
        reject(error);
      });
      
      req.end();
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error polling DID videos:`, error);
    throw error;
  }
}

// Execute the polling function
pollDIDVideos()
  .then(() => {
    console.log(`\n[${new Date().toISOString()}] Manual polling completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n[${new Date().toISOString()}] Manual polling failed:`, error);
    process.exit(1);
  });