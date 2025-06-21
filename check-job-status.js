// Script to check if the job was updated with the video URL
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to check job status
async function checkJobStatus() {
  try {
    // Get the most recent job
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (jobs && jobs.length > 0) {
      const job = jobs[0];
      console.log('Most recent job:', {
        id: job.id,
        status: job.status,
        did_video_url: job.did_video_url,
        created_at: job.created_at,
        updated_at: job.updated_at
      });
      
      // Check if the video URL is set
      if (job.did_video_url && !job.did_video_url.startsWith('pending:')) {
        console.log('\nVideo URL is set in the database. UI should update on refresh.');
      } else if (job.did_video_url && job.did_video_url.startsWith('pending:')) {
        console.log('\nVideo is still marked as pending in the database.');
        console.log('Talk ID:', job.did_video_url.replace('pending:', ''));
        console.log('The webhook may not have updated the database yet.');
      } else {
        console.log('\nNo video URL found in the database.');
      }
      
      // If we need to manually update the job
      if (!job.did_video_url || job.did_video_url.startsWith('pending:')) {
        console.log('\nTo manually update the job with the video URL, run:');
        console.log('node update-job-video.js');
      }
    } else {
      console.log('No jobs found in the database.');
    }
  } catch (error) {
    console.error('Error checking job status:', error);
  }
}

checkJobStatus();
