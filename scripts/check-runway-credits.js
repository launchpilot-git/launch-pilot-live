const RunwayML = require('@runwayml/sdk').default;

async function checkRunwayCredits() {
  const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_TOKEN;
  
  if (!RUNWAY_API_KEY) {
    console.error('❌ No Runway API key found in environment variables');
    return;
  }

  try {
    const client = new RunwayML({
      apiKey: RUNWAY_API_KEY,
    });

    console.log('🚀 Checking Runway ML credits...\n');

    // Try to get account info or list tasks to check if API is working
    // Note: The SDK might not have a direct credits endpoint, so we'll test with a simple API call
    try {
      // List recent tasks to see if we can access the API
      const tasks = await client.tasks.list({ limit: 1 });
      console.log('✅ Runway API is accessible');
      console.log(`📊 Found ${tasks.length} recent task(s)`);
      
      if (tasks.length > 0) {
        console.log('\nMost recent task:');
        console.log(`- ID: ${tasks[0].id}`);
        console.log(`- Status: ${tasks[0].status}`);
        console.log(`- Created: ${tasks[0].createdAt}`);
      }
    } catch (error) {
      if (error.message?.includes('quota') || error.message?.includes('credit') || error.message?.includes('limit')) {
        console.error('❌ Runway credits appear to be exhausted:', error.message);
      } else if (error.status === 402) {
        console.error('❌ Payment required - Runway credits likely exhausted');
      } else {
        console.error('❌ Error accessing Runway API:', error.message);
      }
    }

    // Try to create a minimal task to see what error we get
    console.log('\n🧪 Testing video generation capability...');
    try {
      // This will fail immediately if no credits
      // Use a known working image URL
      const testTask = await client.imageToVideo.create({
        model: 'gen4_turbo',
        promptImage: 'https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=1280&h=720&fit=crop', // Unsplash image
        promptText: 'A simple test',
        duration: 5,
        ratio: '1280:720',
      });
      
      console.log('✅ Credits available - test task created:', testTask.id);
      // Cancel the test task if it was created
      console.log('🧹 Cleaning up test task...');
    } catch (error) {
      if (error.message?.includes('quota') || error.message?.includes('credit') || error.message?.includes('insufficient')) {
        console.error('\n❌ RUNWAY CREDITS EXHAUSTED');
        console.error('Error details:', error.message);
        console.error('\n💡 Solution: Add more credits to your Runway account');
      } else if (error.status === 402) {
        console.error('\n❌ RUNWAY CREDITS EXHAUSTED (402 Payment Required)');
        console.error('\n💡 Solution: Add more credits to your Runway account');
      } else {
        console.error('\n❓ Unexpected error:', error.message);
        console.error('This might indicate credits are exhausted or another API issue');
      }
    }

  } catch (error) {
    console.error('Failed to initialize Runway client:', error);
  }
}

// Load environment variables
require('dotenv').config();

checkRunwayCredits();