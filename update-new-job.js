// Script to update the new job with the correct video URL
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The job ID and video URL to update
const jobId = 'c32cf2c8-5489-40ed-b96b-83bd83c49424';
const videoUrl = 'https://d-id-talks-prod.s3.us-west-2.amazonaws.com/google-oauth2%7C112389944830955988983/tlk_9eDAXwzwLhHRyNJZntpJ4/1749056483461.mp4?AWSAccessKeyId=AKIA5CUMPJBIK65W6FGA&Expires=1749142958&Signature=gF1ClWrgn1NTNUsJmsba8TQNG7c%3D';

// Function to update the job
async function updateJobVideoUrl() {
  try {
    console.log(`Updating job ${jobId} with the correct video URL...`);
    
    // Update the job
    const { data, error } = await supabase
      .from('jobs')
      .update({
        did_video_url: videoUrl,
        status: 'complete'
      })
      .eq('id', jobId);
    
    if (error) {
      throw error;
    }
    
    console.log('Job updated successfully!');
    console.log('The "Watch" button should now appear in the dashboard.');
    console.log('Please refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('Error updating job:', error);
  }
}

// Run the function
updateJobVideoUrl();
