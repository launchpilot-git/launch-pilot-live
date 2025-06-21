import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { DIDService } from "@/lib/d-id-service-fixed"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Validate environment variables
if (!process.env.DID_API_KEY) {
  throw new Error("DID_API_KEY environment variable is required")
}

const didService = new DIDService(process.env.DID_API_KEY)

async function logStep(jobId: string, step: string, data: any) {
  console.log(`[D-ID Manual Job ${jobId}] ${step}:`, data)
  try {
    const { error } = await supabase.from("job_logs").insert({
      job_id: jobId,
      step: `DID_MANUAL_${step}`,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    })
    if (error) console.error("Failed to log step:", error)
  } catch (err) {
    console.error("Failed to log step:", err)
  }
}

// Helper function to check user authentication and permissions
async function checkUserAuth(request: NextRequest) {
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
      
      if (!userError) {
        user = tokenUser
      }
    }

    // Fallback: try SSR cookies approach
    if (!user) {
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
      
      if (!ssrError) {
        user = ssrUser
      }
    }

    if (!user) {
      return { error: "Authentication required", status: 401 }
    }

    // Get user profile to check plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return { error: "Failed to get user profile", status: 500 }
    }

    // Only allow Pro users to use manual avatar generation
    if (profile?.plan !== 'pro') {
      return { error: "Pro plan required for avatar video generation", status: 403 }
    }

    return { success: true, user, plan: profile.plan }
  } catch (error) {
    console.error("Error checking user auth:", error)
    return { error: "Internal authentication error", status: 500 }
  }
}

// Voice configuration based on brand style
function getVoiceConfig(brandStyle: string) {
  const voiceConfigs = {
    professional: { voice: "en-US-AriaNeural", style: "Friendly" },
    elegant: { voice: "en-US-AriaNeural", style: "Hopeful" },
    bold: { voice: "en-US-JennyNeural", style: "Excited" },
    playful: { voice: "en-US-JennyNeural", style: "Cheerful" },
    luxury: { voice: "en-US-AriaNeural", style: "Hopeful" },
    minimal: { voice: "en-US-BrianNeural", style: "Friendly" },
    casual: { voice: "en-US-JennyNeural", style: "Cheerful" },
    witty: { voice: "en-US-JennyNeural", style: "Excited" },
  }

  return voiceConfigs[brandStyle.toLowerCase()] || { voice: "en-US-JennyNeural", style: "Cheerful" }
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null

  try {
    const { jobId: requestJobId, script } = await request.json()
    jobId = requestJobId

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 })
    }

    // Check user authentication and Pro plan
    const authCheck = await checkUserAuth(request)
    if (!authCheck.success) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      )
    }

    const { user } = authCheck

    await logStep(jobId, "REQUEST_START", { jobId, userId: user.id, scriptLength: script.length })

    // Get job details and verify ownership
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || "No job data"}`)
    }

    // Verify user owns this job
    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to access this job" },
        { status: 403 }
      )
    }

    await logStep(jobId, "JOB_RETRIEVED", {
      business_name: job.business_name,
      brand_style: job.brand_style,
      image_url: job.image_url,
      original_script_length: job.openai_avatar_script?.length,
      edited_script_length: script.length,
    })

    // Test D-ID connection first
    const connectionTest = await didService.testConnection()
    await logStep(jobId, "CONNECTION_TEST", { connected: connectionTest })

    if (!connectionTest) {
      throw new Error("D-ID API connection test failed - check API key and network connectivity")
    }

    // Get voice configuration based on brand style
    const voiceConfig = getVoiceConfig(job.brand_style)
    await logStep(jobId, "VOICE_SELECTED", { ...voiceConfig, brand_style: job.brand_style })

    // Create D-ID video with the edited script
    try {
      const didResponse = await didService.createTalkFromScript(job.image_url, script, {
        voice: voiceConfig.voice as any,
        voiceStyle: voiceConfig.style as any,
        useDefaultPresenter: true, // Use default presenter to avoid face detection issues
        expressions: [
          {
            start_frame: 0,
            expression: "neutral",
            intensity: 0.8,
          },
        ],
      })

      await logStep(jobId, "TALK_CREATED", {
        talkId: didResponse.id,
        status: didResponse.status,
        created_at: didResponse.created_at,
        edited_script: true,
      })

      // Update job with pending status and save the edited script
      await supabase
        .from("jobs")
        .update({ 
          did_video_url: `pending:${didResponse.id}`,
          openai_avatar_script: script // Save the edited script
        })
        .eq("id", jobId)

      await logStep(jobId, "JOB_UPDATED", { 
        status: "pending", 
        talkId: didResponse.id,
        script_updated: true 
      })

      return NextResponse.json({
        success: true,
        didData: didResponse,
        talkId: didResponse.id,
        status: didResponse.status,
        message: "Avatar video generation started with your edited script"
      })
    } catch (primaryError) {
      await logStep(jobId, "PRIMARY_ATTEMPT_FAILED", {
        error: primaryError.message,
        attempting_fallback: true,
      })

      // Fallback attempt with minimal configuration
      try {
        console.log("Retrying with minimal configuration...")

        const simpleResponse = await didService.createTalkFromScript(job.image_url, script, {
          voice: "en-US-JennyNeural",
          voiceStyle: "Cheerful",
          useDefaultPresenter: true,
        })

        await logStep(jobId, "FALLBACK_TALK_CREATED", {
          talkId: simpleResponse.id,
          status: simpleResponse.status,
          note: "Created with fallback configuration",
          edited_script: true,
        })

        // Update job with pending status and save the edited script
        await supabase
          .from("jobs")
          .update({ 
            did_video_url: `pending:${simpleResponse.id}`,
            openai_avatar_script: script // Save the edited script
          })
          .eq("id", jobId)

        return NextResponse.json({
          success: true,
          didData: simpleResponse,
          talkId: simpleResponse.id,
          status: simpleResponse.status,
          message: "Avatar video generation started with fallback configuration"
        })
      } catch (fallbackError) {
        await logStep(jobId, "FALLBACK_FAILED", {
          error: fallbackError.message,
          using_placeholder: true,
        })
        throw fallbackError
      }
    }
  } catch (error) {
    console.error("Error creating manual D-ID video:", error)

    if (jobId) {
      await logStep(jobId, "ERROR", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })

      // Set placeholder video URL
      await supabase
        .from("jobs")
        .update({
          did_video_url: "https://example.com/avatar-video-placeholder.mp4",
        })
        .eq("id", jobId)

      await logStep(jobId, "PLACEHOLDER_SET", {
        placeholder_url: "https://example.com/avatar-video-placeholder.mp4",
        reason: "manual_generation_failed"
      })
    }

    return NextResponse.json(
      {
        error: "Failed to create D-ID video",
        details: error.message,
        jobId,
      },
      { status: 500 },
    )
  }
}