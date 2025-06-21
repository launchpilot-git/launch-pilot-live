#!/usr/bin/env node

/**
 * This script is designed to be run as a cron job to automatically poll for DID video updates.
 * It calls the /api/poll-did-videos endpoint to check for pending videos and update their status.
 * 
 * Example cron entry (runs every minute):
 * * * * * * cd /path/to/launchpilot && node scripts/poll-did-videos-cron.js >> logs/poll-videos.log 2>&1
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Get base URL from environment or use default localhost
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

async function pollDIDVideos() {
  console.log(`[${new Date().toISOString()}] Polling for DID video updates...`);
  
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
              console.log(`[${new Date().toISOString()}] Poll results:`, JSON.stringify(result));
              resolve(result);
            } catch (error) {
              console.error(`[${new Date().toISOString()}] Error parsing response:`, error);
              reject(error);
            }
          } else {
            console.error(`[${new Date().toISOString()}] Error status code:`, res.statusCode, data);
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
    console.log(`[${new Date().toISOString()}] Polling completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Polling failed:`, error);
    process.exit(1);
  });
