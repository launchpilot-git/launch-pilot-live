// Script to remove test jobs from the database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to remove test jobs
async function removeTestJobs() {
  try {
    console.log('Finding test jobs with business_name = "Test Business"...');
    
    // Get all test jobs
    const { data: testJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('id, business_name, created_at')
      .eq('business_name', 'Test Business');
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!testJobs || testJobs.length === 0) {
      console.log('No test jobs found.');
      return;
    }
    
    console.log(`Found ${testJobs.length} test jobs:`);
    testJobs.forEach(job => {
      console.log(`- ID: ${job.id}, Created: ${new Date(job.created_at).toLocaleString()}`);
    });
    
    // Delete the test jobs
    console.log('\nDeleting test jobs...');
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('business_name', 'Test Business');
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`Successfully deleted ${testJobs.length} test jobs.`);
    console.log('Refresh your browser to see the updated dashboard.');
  } catch (error) {
    console.error('Error removing test jobs:', error);
  }
}

// Run the function
removeTestJobs();
