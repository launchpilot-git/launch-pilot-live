require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRecentJobs() {
  console.log('🔍 Checking recent jobs...')
  
  try {
    // Get the most recent jobs from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('❌ Error fetching jobs:', error)
      return
    }
    
    console.log(`📊 Found ${jobs.length} recent jobs:`)
    
    for (const job of jobs) {
      console.log(`\n🎯 Job ${job.id}:`)
      console.log(`   Status: ${job.status}`)
      console.log(`   Created: ${job.created_at}`)
      console.log(`   Business: ${job.business_name}`)
      console.log(`   Avatar Video: ${job.did_video_url || 'None'}`)
      console.log(`   Promo Video: ${job.promo_video_url || 'None'}`)
      
      // Check logs for this job
      const { data: logs, error: logError } = await supabase
        .from('job_logs')
        .select('*')
        .eq('job_id', job.id)
        .order('timestamp', { ascending: false })
        .limit(10)
      
      if (!logError && logs.length > 0) {
        console.log(`   Recent logs (${logs.length}):`)
        logs.forEach(log => {
          console.log(`     ${log.timestamp}: ${log.step} - ${log.data}`)
        })
      }
    }
    
    // Check if there are any pending D-ID videos that need polling
    const { data: pendingJobs, error: pendingError } = await supabase
      .from('jobs')
      .select('id, did_video_url, created_at')
      .like('did_video_url', 'pending:%')
      .gte('created_at', twoHoursAgo)
    
    if (!pendingError && pendingJobs.length > 0) {
      console.log(`\n⏳ Found ${pendingJobs.length} jobs with pending D-ID videos:`)
      pendingJobs.forEach(job => {
        console.log(`   Job ${job.id}: ${job.did_video_url} (created ${job.created_at})`)
      })
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

checkRecentJobs()