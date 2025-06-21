require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
);

async function testColumn() {
  console.log('Testing if promo_video_error column exists...');
  
  // Get the first job to test with
  const { data: jobs, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .limit(1);
    
  if (jobError || !jobs || jobs.length === 0) {
    console.log('No jobs found to test with');
    return;
  }
  
  const jobId = jobs[0].id;
  console.log('Testing with job ID:', jobId);
  
  // Try to update with the new field
  const { data, error } = await supabase
    .from('jobs')
    .update({ promo_video_error: 'test error message' })
    .eq('id', jobId)
    .select();
    
  if (error) {
    console.error('Column does not exist:', error.message);
    console.log('');
    console.log('⚠️  Manual Step Required:');
    console.log('Please run this SQL command in your Supabase SQL editor:');
    console.log('');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promo_video_error TEXT;');
    console.log('');
  } else {
    console.log('✅ Column promo_video_error exists and is working');
    // Clean up the test
    await supabase
      .from('jobs')
      .update({ promo_video_error: null })
      .eq('id', jobId);
  }
}

testColumn();