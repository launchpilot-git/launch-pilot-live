import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import OpenAI from "openai"
import RunwayML from "@runwayml/sdk"

// Use environment variables for Supabase - service role client for admin operations
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, '').trim()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s+/g, '').trim()

console.log('Service role key length:', serviceRoleKey.length)
console.log('Service role key starts with:', serviceRoleKey.substring(0, 20) + '...')

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Initialize OpenAI with environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Initialize Runway ML client with environment variable
const runwayClient = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_TOKEN!,
})

// Helper function to log steps
async function logStep(jobId: string, step: string, data: any) {
  console.log(`[Job ${jobId}] ${step}:`, data)

  // Re-enable database logging to debug Runway issues
  try {
    const { error } = await supabase.from("job_logs").insert({
      job_id: jobId,
      step,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error("Failed to log step:", error)
    }
  } catch (err) {
    console.error("Failed to log step:", err)
  }
}

// Helper function to get the correct base URL
function getBaseUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

// Helper function to check user plan and permissions
async function checkUserPlanAndPermissions(request: NextRequest) {
  try {
    let user = null

    // Try bearer token first
    const authHeader = request.headers.get('authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')

      // Create client with user session
      const userSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
      )

      // Get current user using the token
      const { data: { user: tokenUser }, error: userError } = await userSupabase.auth.getUser(token)
      
      if (userError) {
        console.error('Token validation error:', userError)
        console.error('Token length:', token.length)
        console.error('Token starts with:', token.substring(0, 20) + '...')
      } else {
        user = tokenUser
      }
    }

    // Fallback: try SSR cookies approach
    if (!user) {
      console.log('Bearer token failed, trying SSR approach')
      const cookieStore = await cookies()
      
      const supabaseSSR = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            }
          }
        }
      )

      const { data: { user: ssrUser }, error: ssrError } = await supabaseSSR.auth.getUser()
      
      if (ssrError) {
        console.error('SSR authentication error:', ssrError)
      } else {
        user = ssrUser
      }
    }

    if (!user) {
      return { error: "Authentication required", status: 401 }
    }

    // Get user profile with plan information  
    console.log(`Querying profile for user: ${user.id}`)
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, generations_used, generations_reset_date')
      .eq('id', user.id)
      .single()

    console.log('Profile query result:', { profile, profileError })

    // If profile doesn't exist, create it automatically
    if (profileError && profileError.code === 'PGRST116') {
      console.log(`Creating default profile for user ${user.id}`)
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          plan: 'free',
          generations_used: 0,
          generations_reset_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('plan, generations_used, generations_reset_date')
        .single()

      if (createError) {
        console.error('Failed to create user profile:', createError)
        return { error: "Failed to create user profile", status: 500 }
      }

      profile = newProfile
      console.log(`Successfully created profile for user ${user.id}`)
    } else if (profileError) {
      console.error('Profile query error:', profileError)
      return { error: "Database error accessing user profile", status: 500 }
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

// Helper function to increment user generation count
async function incrementGenerationCount(userId: string, currentCount: number) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        generations_used: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error("Error incrementing generation count:", error)
    }
  } catch (error) {
    console.error("Error incrementing generation count:", error)
  }
}

// Helper function to check image aspect ratio and provide a compatible URL
async function ensureRunwayCompatibleImage(imageUrl: string, jobId: string) {
  try {
    // For now, we'll use the original image and let Runway handle it
    // In the future, we could add image resizing/cropping here
    await logStep(jobId, "RUNWAY_IMAGE_CHECK", {
      originalUrl: imageUrl,
      note: "Using original image - Runway will validate aspect ratio"
    })
    
    return imageUrl
  } catch (error) {
    await logStep(jobId, "RUNWAY_IMAGE_PROCESSING_ERROR", {
      error: error.message,
      imageUrl
    })
    throw error
  }
}

// Helper function to get user-friendly error message
function getRunwayUserFriendlyError(error: any): { message: string; canRetry: boolean } {
  const errorMessage = error.message?.toLowerCase() || ''
  const errorString = JSON.stringify(error).toLowerCase()
  
  // Aspect ratio issues
  if (errorMessage.includes('aspect ratio') || errorMessage.includes('width / height ratio') || 
      errorMessage.includes('dimensions')) {
    return {
      message: "Your image dimensions aren't compatible with video generation. Please upload an image with one of these aspect ratios: 16:9 (landscape), 9:16 (portrait), or 1:1 (square).",
      canRetry: true
    }
  }
  
  // File size issues
  if (errorMessage.includes('file size') || errorMessage.includes('too large') || 
      errorMessage.includes('exceeds') || errorMessage.includes('16mb')) {
    return {
      message: "Your image is too large. Please upload an image smaller than 16MB.",
      canRetry: true
    }
  }
  
  // File type issues
  if (errorMessage.includes('content-type') || errorMessage.includes('file type') || 
      errorMessage.includes('unsupported format') || errorMessage.includes('invalid format')) {
    return {
      message: "Please upload a JPEG, PNG, or WebP image. Other formats aren't supported for video generation.",
      canRetry: true
    }
  }
  
  // Image resolution/quality issues
  if (errorMessage.includes('resolution') || errorMessage.includes('quality') || 
      errorMessage.includes('too small') || errorMessage.includes('minimum resolution') ||
      errorMessage.includes('pixels') || errorMessage.includes('image quality') ||
      errorMessage.includes('insufficient resolution') || errorMessage.includes('low resolution') ||
      errorMessage.includes('image size') || errorMessage.includes('pixel count')) {
    return {
      message: "Your image resolution is too low for video generation. Please upload a higher quality image (minimum 512x512 pixels recommended).",
      canRetry: true
    }
  }
  
  // URL/Network issues
  if (errorMessage.includes('url') || errorMessage.includes('https') || 
      errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
    return {
      message: "There was an issue accessing your image. Please try uploading again.",
      canRetry: true
    }
  }
  
  // Content moderation issues
  if (errorMessage.includes('moderation') || errorMessage.includes('policy') || 
      errorMessage.includes('prohibited') || errorMessage.includes('inappropriate')) {
    return {
      message: "We couldn't process this image. Please try a different product image.",
      canRetry: true
    }
  }
  
  // Timeout issues
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      message: "Video generation is taking longer than expected. Please try again in a few minutes.",
      canRetry: true
    }
  }
  
  // Rate limit issues
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      message: "We're experiencing high demand. Please try again in a few minutes.",
      canRetry: true
    }
  }
  
  // Generic/unknown errors
  return {
    message: "We encountered an issue generating your video. Please try again with a different image.",
    canRetry: true
  }
}

// Runway video generation using the official SDK
async function createRunwayVideo(jobId: string, imageUrl: string, script: string) {
  const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_TOKEN
  if (!RUNWAY_API_KEY) {
    throw new Error("RUNWAY_API_KEY, RUNWAYML_API_SECRET, or RUNWAY_API_TOKEN not configured")
  }

  await logStep(jobId, "RUNWAY_REQUEST_DETAILS", {
    imageUrl,
    scriptLength: script.length,
    hasApiKey: !!RUNWAY_API_KEY,
    apiKeyLength: RUNWAY_API_KEY ? RUNWAY_API_KEY.length : 0,
  })

  try {
    // Ensure image is compatible with Runway requirements
    const compatibleImageUrl = await ensureRunwayCompatibleImage(imageUrl, jobId)
    
    await logStep(jobId, "RUNWAY_SDK_REQUEST_START", {
      model: "gen4_turbo",
      ratio: "1280:720",
      duration: 5,
      imageUrl: compatibleImageUrl,
    })

    // Create image-to-video task using the official SDK
    const imageToVideo = await runwayClient.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: compatibleImageUrl,
      promptText: script,
      ratio: "1280:720",
      duration: 5,
    })

    await logStep(jobId, "RUNWAY_TASK_CREATED", { taskId: imageToVideo.id, status: imageToVideo.status })

    // Poll the task until it's complete
    let task = imageToVideo
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max (5 second intervals)

    while (!["SUCCEEDED", "FAILED"].includes(task.status) && attempts < maxAttempts) {
      // Wait for 10 seconds before polling
      await new Promise((resolve) => setTimeout(resolve, 10000))
      attempts++

      await logStep(jobId, "RUNWAY_POLLING", { attempt: attempts, taskId: task.id })

      try {
        task = await runwayClient.tasks.retrieve(task.id)
        await logStep(jobId, "RUNWAY_POLL_RESPONSE", {
          status: task.status,
          attempt: attempts,
          hasOutput: !!task.output,
        })
      } catch (pollError) {
        await logStep(jobId, "RUNWAY_POLL_ERROR", {
          error: pollError.message,
          attempt: attempts,
        })
        throw pollError
      }
    }

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0]
      if (videoUrl) {
        // Update job with the video URL
        await supabase.from("jobs").update({ promo_video_url: videoUrl }).eq("id", jobId)
        await logStep(jobId, "RUNWAY_VIDEO_COMPLETE", { videoUrl })
        return task
      } else {
        throw new Error("No video URL in completed task")
      }
    } else if (task.status === "FAILED") {
      throw new Error(`${task.failureReason || "Video generation failed"}`)
    } else {
      throw new Error("Video generation is taking longer than expected")
    }
  } catch (error) {
    await logStep(jobId, "RUNWAY_REQUEST_EXCEPTION", {
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
    })
    
    // Get user-friendly error message
    const userError = getRunwayUserFriendlyError(error)
    
    await logStep(jobId, "RUNWAY_USER_ERROR", {
      originalError: error.message,
      userMessage: userError.message,
      canRetry: userError.canRetry
    })
    
    // Update job with failed status and user-friendly error
    await supabase.from("jobs").update({ 
      promo_video_url: `failed:${userError.message}`,
      promo_video_error: userError.message
    }).eq("id", jobId)
    
    // Throw the user-friendly error
    throw new Error(userError.message)
  }
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null

  try {
    const { jobId: requestJobId } = await request.json()
    jobId = requestJobId

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      )
    }

    console.log(`Starting job processing for ${jobId}`)
    
    // Check user plan and permissions before processing
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

    const { user, plan, generationsUsed } = planCheck

    await logStep(jobId, "PROCESS_START", {
      jobId,
      userId: user.id,
      userPlan: plan,
      generationsUsed,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasDIDKey: !!process.env.DID_API_KEY,
      hasRunwayKey: !!(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET),
      baseUrl: getBaseUrl(),
      vercelUrl: process.env.VERCEL_URL,
      vercelProjectUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    })

    // Get job details
    const { data: job, error: jobError } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (jobError) {
      console.error("Job fetch error:", jobError)
      throw new Error(`Job not found: ${jobError.message}`)
    }

    if (!job) {
      throw new Error("Job not found")
    }

    await logStep(jobId, "JOB_RETRIEVED", {
      business_name: job.business_name,
      brand_style: job.brand_style,
      industry: job.industry,
      image_url: job.image_url,
    })

    // Update status to generating
    const { error: updateError } = await supabase.from("jobs").update({ status: "generating" }).eq("id", jobId)
    if (updateError) {
      throw new Error(`Failed to update job status: ${updateError.message}`)
    }

    await logStep(jobId, "STATUS_UPDATED", { status: "generating" })

    // Generate content with OpenAI GPT-4o Vision
    const prompts = {
      caption: `Analyze this product image and write a short social media caption (under 220 characters) using this brand style: ${job.brand_style}, for a business in the ${job.industry} industry. Make it engaging and include relevant hashtags.`,
      email: `Analyze this product image and write a 100–150 word marketing email to help ${job.business_name} (in the ${job.industry} industry) promote this product. Use a ${job.brand_style} tone. This is for a customer newsletter. Include a compelling subject line.`,
      avatarScript: `Analyze this product image and write a 2–3 sentence script for a talking avatar who is introducing this product directly to camera. Keep it conversational, confident, and aligned with the ${job.brand_style} tone. The business is called ${job.business_name}. Focus on the key benefits visible in the image.`,
      cinematicScript: `You are creating a prompt for Runway Gen-4 Turbo video generation. Analyze this product image and generate a Runway-optimized prompt.

CRITICAL ANALYSIS PHASE:
First, analyze the image to determine:
1. Product category (beauty/tech/fashion/food/automotive/home/other)
2. Background complexity (simple/complex)
3. Lighting conditions
4. Overall composition

ENHANCED PROMPT TEMPLATE:
{SUBJECT}, {ENHANCED_MOTION}, {ENVIRONMENT}, {LIGHTING} --length 5s --no text watermark blurry distorted duplicate mutation deformed low quality artifacts grain pixelated

ASSEMBLY GUIDELINES:

1. SUBJECT: Extract core product in 6 words or less (e.g., "crystal perfume bottle", "sleek wireless headphones")

2. ENHANCED MOTION: Use brand tone mapping for "${job.brand_style}":
   - bold → "dramatic push-in with slight upward tilt"
   - witty → "playful bounce-in with gentle left pan"
   - casual → "handheld drift-right with natural sway"
   - elegant → "smooth arc-right with gradual pullback"
   - uplifting → "ascending dolly-in with brightening exposure"
   - fun → "energetic pan-left with slight zoom pulse"
   - empowering → "steady rise-up with confident forward push"
   - minimalist → "zen-like slow zoom with static frame"

3. PRODUCT CATEGORY OVERRIDE (if applicable):
   - beauty → "luxurious reveal with soft glow"
   - tech → "precision engineering showcase with clean lines"
   - fashion → "elegant fabric flow with natural lighting"
   - food → "appetizing close-up with warm ambient light"
   - automotive → "dynamic reveal with dramatic shadows"
   - home → "cozy lifestyle pan with inviting warmth"

4. ENVIRONMENT: Add only if background is simple (e.g., "marble surface", "clean studio")

5. LIGHTING: Choose based on image analysis: "soft studio lighting", "natural light", "dramatic lighting"

6. DURATION: Always use 5s for products (optimal quality)

7. NEGATIVE PROMPTS: Always end with full negative prompt list

VALIDATION RULES:
- Keep total prompt under 75 characters (excluding negative prompts)
- Never combine conflicting movements
- Always include motion speed modifier (smooth, gentle, deliberate)
- Avoid: fast, rapid, sudden (cause jitter)

Output ONLY the final prompt string. Example:
crystal perfume bottle, smooth arc-right with gradual pullback, marble surface, soft studio lighting --length 5s --no text watermark blurry distorted duplicate mutation deformed low quality artifacts grain pixelated`,
    }

    await logStep(jobId, "PROMPTS_GENERATED", prompts)

    console.log(`Processing job ${jobId} for ${job.business_name}`)

    // Use GPT-4o Vision for image analysis
    await logStep(jobId, "OPENAI_REQUEST_START", { model: "gpt-4o", prompts_count: 4 })

    try {
      const [captionResponse, emailResponse, avatarResponse, cinematicResponse] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts.caption },
                { type: "image_url", image_url: { url: job.image_url } },
              ],
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts.email },
                { type: "image_url", image_url: { url: job.image_url } },
              ],
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts.avatarScript },
                { type: "image_url", image_url: { url: job.image_url } },
              ],
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts.cinematicScript },
                { type: "image_url", image_url: { url: job.image_url } },
              ],
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
      ])

      const results = {
        openai_caption: captionResponse.choices[0]?.message?.content || "",
        openai_email: emailResponse.choices[0]?.message?.content || "",
        openai_avatar_script: avatarResponse.choices[0]?.message?.content || "",
        openai_cinematic_script: cinematicResponse.choices[0]?.message?.content || "",
      }

      await logStep(jobId, "OPENAI_RESPONSES", {
        results,
        usage: {
          caption: captionResponse.usage,
          email: emailResponse.usage,
          avatar: avatarResponse.usage,
          cinematic: cinematicResponse.usage,
        },
      })

      // Update job with OpenAI results
      const { error: resultsError } = await supabase.from("jobs").update(results).eq("id", jobId)
      if (resultsError) {
        throw new Error(`Failed to save results: ${resultsError.message}`)
      }

      await logStep(jobId, "OPENAI_RESULTS_SAVED", { results_saved: true })

      // Only generate videos for Pro users
      if (plan === 'pro') {
        await logStep(jobId, "VIDEO_GENERATION_START", { starting_video_apis: true, note: "Pro user - offering script editing first, then generating videos" })

        // Set script_ready for avatar video (allows editing) and start promo video immediately
        await supabase
          .from("jobs")
          .update({
            did_video_url: "script_ready", // This enables the script editor
            promo_video_url: "pending:runway_processing",
          })
          .eq("id", jobId)

        // Start promo video generation immediately (in background)
        const runwayResult = await Promise.allSettled([
          createRunwayVideo(jobId, job.image_url, results.openai_cinematic_script),
        ])

        // Avatar video is now script_ready - user can edit script before generating

        // Handle Runway result
        if (runwayResult[0].status === "fulfilled") {
          await logStep(jobId, "RUNWAY_REQUEST_SUCCESS", { note: "Runway video generation completed" })
        } else {
          // Error is already handled in createRunwayVideo with user-friendly messages
          await logStep(jobId, "RUNWAY_REQUEST_ERROR", { 
            error: runwayResult[0].reason?.message || "Unknown error",
            note: "User-friendly error already set in createRunwayVideo function"
          })
        }
      } else {
        await logStep(jobId, "FREE_USER_SKIP_VIDEOS", { note: "Free user - skipping video generation, text content only" })
      }

      // Mark as complete since we have text content and videos are processing
      await supabase.from("jobs").update({ status: "complete" }).eq("id", jobId)
      await logStep(jobId, "STATUS_COMPLETE", {
        all_content_ready: true,
        note: "All content generated, videos processing via webhooks",
      })

      // Increment generation count for the user (only count successful generations)
      await incrementGenerationCount(user.id, generationsUsed)
      await logStep(jobId, "GENERATION_COUNT_INCREMENTED", {
        userId: user.id,
        previousCount: generationsUsed,
        newCount: generationsUsed + 1,
        userPlan: plan
      })

      await logStep(jobId, "PROCESS_COMPLETE", {
        success: true,
        note: "Content generated successfully",
      })

      return NextResponse.json({ success: true, results })
    } catch (openaiError) {
      console.error("OpenAI API Error:", openaiError)
      const errorMessage = openaiError instanceof Error ? openaiError.message : String(openaiError)
      const errorStack = openaiError instanceof Error ? openaiError.stack : undefined
      
      await logStep(jobId, "OPENAI_ERROR", {
        error: errorMessage,
        stack: errorStack,
      })
      throw new Error(`OpenAI API failed: ${errorMessage}`)
    }
  } catch (error) {
    console.error("Error processing job:", error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    if (jobId) {
      await logStep(jobId, "PROCESS_ERROR", {
        error: errorMessage,
        stack: errorStack,
      })
    }

    // Update job status to failed
    try {
      if (jobId) {
        const { error: failError } = await supabase.from("jobs").update({ status: "failed" }).eq("id", jobId)
        if (failError) {
          console.error("Error updating job status to failed:", failError)
        }
      }
    } catch (updateError) {
      console.error("Error updating job status to failed:", updateError)
    }

    return NextResponse.json(
      {
        error: "Failed to process job",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
