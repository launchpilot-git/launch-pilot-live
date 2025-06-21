// Script to clear all jobs from the database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to clear all jobs
async function clearAllJobs() {
  try {
    console.log('Finding all jobs in the database...');
    
    // Get all jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, business_name, created_at');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No jobs found in the database.');
      return;
    }
    
    console.log(`Found ${jobs.length} jobs:`);
    jobs.forEach(job => {
      console.log(`- ID: ${job.id}, Business: ${job.business_name}, Created: ${new Date(job.created_at).toLocaleString()}`);
    });
    
    // Confirm deletion
    console.log('\nDeleting all jobs...');
    
    // Delete all jobs - we'll delete them one by one to avoid syntax issues
    console.log('Deleting jobs one by one...');
    
    let successCount = 0;
    for (const job of jobs) {
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);
      
      if (deleteError) {
        console.error(`Failed to delete job ${job.id}:`, deleteError);
      } else {
        successCount++;
        process.stdout.write('.');
      }
    }
    
    console.log('\n')
    
    console.log(`Successfully deleted ${successCount} out of ${jobs.length} jobs.`);
    console.log('The dashboard is now empty. Refresh your browser to see the changes.');
  } catch (error) {
    console.error('Error clearing jobs:', error);
  }
}

// Run the function
clearAllJobs();
