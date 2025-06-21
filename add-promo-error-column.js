require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
);

async function addColumn() {
  console.log('Adding promo_video_error column to jobs table...');
  
  try {
    // First, check if the column already exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'jobs')
      .eq('column_name', 'promo_video_error');
    
    if (columnError) {
      console.error('Error checking for existing column:', columnError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('Column promo_video_error already exists');
      return;
    }
    
    console.log('Column does not exist, adding it...');
    
    // Use a different approach - try to insert/update a record to trigger schema changes
    // This is a workaround since we can't execute DDL directly via the client
    
    console.log('');
    console.log('⚠️  Manual Step Required:');
    console.log('Please run this SQL command in your Supabase SQL editor:');
    console.log('');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promo_video_error TEXT;');
    console.log('');
    console.log('This will add the promo_video_error column to store user-friendly error messages.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addColumn();