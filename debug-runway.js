require('dotenv').config({ path: '.env.local' })

console.log('🔍 Checking Runway API Configuration...')

// Check all possible environment variable names
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY
const RUNWAYML_API_SECRET = process.env.RUNWAYML_API_SECRET  
const RUNWAY_API_TOKEN = process.env.RUNWAY_API_TOKEN

console.log('Environment Variables:')
console.log(`RUNWAY_API_KEY: ${RUNWAY_API_KEY ? '✅ Set (length: ' + RUNWAY_API_KEY.length + ')' : '❌ Not set'}`)
console.log(`RUNWAYML_API_SECRET: ${RUNWAYML_API_SECRET ? '✅ Set (length: ' + RUNWAYML_API_SECRET.length + ')' : '❌ Not set'}`)
console.log(`RUNWAY_API_TOKEN: ${RUNWAY_API_TOKEN ? '✅ Set (length: ' + RUNWAY_API_TOKEN.length + ')' : '❌ Not set'}`)

// Test the same logic as the API route
const selectedKey = RUNWAY_API_KEY || RUNWAYML_API_SECRET || RUNWAY_API_TOKEN
console.log(`\nSelected API Key: ${selectedKey ? '✅ ' + selectedKey.substring(0, 20) + '...' : '❌ None found'}`)

if (selectedKey) {
  console.log('✅ Runway API key is available for the app')
} else {
  console.log('❌ No Runway API key found - promo videos will fail')
}

// Check recent job logs for Runway-related errors
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRunwayLogs() {
  console.log('\n🔍 Checking recent Runway logs...')
  
  const { data: logs, error } = await supabase
    .from('job_logs')
    .select('*')
    .ilike('step', '%runway%')
    .order('timestamp', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ Error fetching Runway logs:', error)
    return
  }
  
  if (logs.length === 0) {
    console.log('⚠️ No Runway-related logs found - API might not be executing')
  } else {
    console.log(`📋 Found ${logs.length} Runway logs:`)
    logs.forEach(log => {
      console.log(`   ${log.timestamp}: ${log.step}`)
      console.log(`      ${log.data}`)
    })
  }
}

checkRunwayLogs()