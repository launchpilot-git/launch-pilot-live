// Script to check recent jobs in the database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to check recent jobs
async function checkRecentJobs() {
  try {
    console.log('Checking for recent jobs in the database...');
    
    // Get all jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No jobs found in the database.');
      return;
    }
    
    console.log(`Found ${jobs.length} jobs:`);
    jobs.forEach(job => {
      console.log(`\n--- Job ID: ${job.id} ---`);
      console.log(`Business: ${job.business_name}`);
      console.log(`Created: ${new Date(job.created_at).toLocaleString()}`);
      console.log(`Status: ${job.status}`);
      
      // Check for D-ID related fields
      if (job.did_talk_id) {
        console.log(`D-ID Talk ID: ${job.did_talk_id}`);
      }
      
      if (job.did_video_url) {
        console.log(`D-ID Video URL: ${job.did_video_url}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking jobs:', error);
  }
}

// Run the function
checkRecentJobs();
