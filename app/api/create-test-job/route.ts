import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Helper function to check user plan and permissions
async function checkUserPlanAndPermissions(request: NextRequest) {
  try {
    // Get user session from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const refreshToken = cookieStore.get('sb-refresh-token')?.value

    if (!accessToken || !refreshToken) {
      return { error: "Authentication required", status: 401 }
    }

    // Create client with user session
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Set session
    await userSupabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    // Get current user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    
    if (userError || !user) {
      return { error: "Invalid authentication", status: 401 }
    }

    // Get user profile with plan information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, generations_used, generations_reset_date')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return { error: "User profile not found", status: 404 }
    }

    const userPlan = profile?.plan || 'free'
    const generationsUsed = profile?.generations_used || 0

    // Check if user can generate (pro users have unlimited, free users limited to 3)
    if (userPlan === 'free' && generationsUsed >= 3) {
      return { 
        error: "Generation limit reached. Upgrade to Pro for unlimited generations.", 
        status: 429,
        details: { plan: userPlan, generationsUsed, limit: 3 }
      }
    }

    return { 
      success: true, 
      user, 
      plan: userPlan, 
      generationsUsed 
    }
  } catch (error) {
    console.error("Error checking user plan:", error)
    return { error: "Internal authentication error", status: 500 }
  }
}

// Helper function to get or create a test user
async function getTestUserId(): Promise<string> {
  try {
    // Try to find an existing user first
    const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers()
    
    if (!fetchError && existingUsers?.users && existingUsers.users.length > 0) {
      // Use the first existing user
      return existingUsers.users[0].id
    }

    // If no users exist, create a test user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'test@launchpilot.test',
      password: 'testpassword123',
      email_confirm: true
    })

    if (createError || !newUser.user) {
      throw new Error(`Failed to create test user: ${createError?.message}`)
    }

    // Create a profile for the test user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        plan: 'pro', // Give test user pro access
        generations_used: 0
      })

    if (profileError) {
      console.warn('Failed to create profile for test user:', profileError)
    }

    return newUser.user.id
  } catch (error) {
    console.error('Error getting test user:', error)
    // Fallback: try to use any existing profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (profiles && profiles.length > 0) {
      return profiles[0].id
    }

    throw new Error('Could not get or create a test user')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { business_name, brand_style, industry, image_url, openai_avatar_script, openai_cinematic_script, test_mode } = body

    // If test_mode is true, bypass authentication for testing purposes
    if (test_mode === true) {
      // Get a valid test user ID
      const testUserId = await getTestUserId()

      // Create a test job without authentication for testing
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          user_id: testUserId,
          business_name: business_name || "Test Business",
          brand_style: brand_style || "professional",
          industry: industry || "test",
          image_url: image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
          openai_avatar_script: openai_avatar_script || "Hi there! This is a test.",
          openai_cinematic_script: openai_cinematic_script || "A cinematic test video.",
          status: "generating",
          openai_caption: "Test caption",
          openai_email: "Test email content",
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create test job: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        jobId: job.id,
        message: "Test job created successfully (test mode)",
      })
    }

    // Normal authentication flow for non-test requests
    const planCheck = await checkUserPlanAndPermissions(request)
    
    if (!planCheck.success) {
      return NextResponse.json(
        { 
          error: planCheck.error,
          details: planCheck.details 
        },
        { status: planCheck.status }
      )
    }

    // Create a test job in the database
    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        user_id: planCheck.user.id,
        business_name,
        brand_style,
        industry,
        image_url,
        openai_avatar_script,
        openai_cinematic_script,
        status: "generating", // Set to generating so we can test D-ID directly
        openai_caption: "Test caption",
        openai_email: "Test email content",
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test job: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Test job created successfully",
    })
  } catch (error) {
    console.error("Error creating test job:", error)
    return NextResponse.json(
      {
        error: "Failed to create test job",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
