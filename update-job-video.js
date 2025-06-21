// Script to manually update the job with the video URL
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to get the D-ID talk status
async function getDIDTalkStatus(talkId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.DID_API_KEY;
    
    if (!apiKey) {
      reject('DID_API_KEY not found in .env.local');
      return;
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
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (e) {
          reject(`Error parsing response: ${e.message}`);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(`Error checking talk status: ${error.message}`);
    });
    
    req.end();
  });
}

// Function to update the job with the video URL
async function updateJobWithVideoUrl() {
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
      console.log('Found job:', {
        id: job.id,
        status: job.status,
        did_video_url: job.did_video_url
      });
      
      // Check if the job has a pending video URL
      if (job.did_video_url && job.did_video_url.startsWith('pending:')) {
        const talkId = job.did_video_url.replace('pending:', '');
        console.log(`Getting status for talk ID: ${talkId}`);
        
        // Get the talk status from D-ID
        const talkStatus = await getDIDTalkStatus(talkId);
        console.log('Talk status:', talkStatus.status);
        
        if (talkStatus.status === 'done' && talkStatus.result_url) {
          console.log('Video is ready! Updating job with video URL:', talkStatus.result_url);
          
          // Update the job with the video URL
          const { data: updatedJob, error: updateError } = await supabase
            .from('jobs')
            .update({
              did_video_url: talkStatus.result_url,
              status: 'complete'
            })
            .eq('id', job.id)
            .select();
          
          if (updateError) {
            throw updateError;
          }
          
          console.log('Job updated successfully!');
          console.log('New job data:', updatedJob[0]);
          
          console.log('\nRefresh your browser to see the updated video.');
        } else if (talkStatus.status === 'error') {
          console.log('Error generating video:', talkStatus.error);
        } else {
          console.log('Video is still processing. Current status:', talkStatus.status);
        }
      } else if (job.did_video_url) {
        console.log('Job already has a video URL:', job.did_video_url);
      } else {
        console.log('No video URL found for this job.');
      }
    } else {
      console.log('No jobs found in the database.');
    }
  } catch (error) {
    console.error('Error updating job:', error);
  }
}

// Run the update function
updateJobWithVideoUrl();
