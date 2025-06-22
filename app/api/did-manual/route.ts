import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { DIDService } from "@/lib/d-id-service-fixed"
import { getPresenterConfigForTier, supportsCustomPresenters } from "@/lib/presenter-config"

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

// This function is now replaced by the presenter-config.ts system
// Kept for backward compatibility but will use the new tier-based system

export async function POST(request: NextRequest) {
  let jobId: string | null = null

  try {
    console.log("[D-ID Manual] ===== NEW REQUEST RECEIVED =====")
    console.log("[D-ID Manual] Timestamp:", new Date().toISOString())
    console.log("[D-ID Manual] Headers:", Object.fromEntries(request.headers.entries()))
    
    const { jobId: requestJobId, script } = await request.json()
    jobId = requestJobId

    console.log("[D-ID Manual] Job ID:", jobId)
    console.log("[D-ID Manual] Script length:", script?.length || 0)
    console.log("[D-ID Manual] Script preview:", script?.substring(0, 50) + "...")

    if (!jobId) {
      console.error("[D-ID Manual] ERROR: No job ID provided")
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    if (!script || !script.trim()) {
      console.error("[D-ID Manual] ERROR: No script provided")
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
    console.log("[D-ID Manual] Fetching job from Supabase...")
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    console.log("[D-ID Manual] Job fetch result:", {
      found: !!job,
      error: jobError?.message,
      jobId: job?.id,
      userId: job?.user_id,
      existingDidUrl: job?.did_video_url,
      createdAt: job?.created_at
    })

    if (jobError || !job) {
      console.error("[D-ID Manual] ERROR: Job not found in database")
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
    console.log("[D-ID Manual] Testing D-ID connection...")
    const connectionTest = await didService.testConnection()
    console.log("[D-ID Manual] D-ID connection test result:", connectionTest)
    await logStep(jobId, "CONNECTION_TEST", { connected: connectionTest })

    if (!connectionTest) {
      console.error("[D-ID Manual] ERROR: D-ID connection test failed")
      console.error("[D-ID Manual] API Key present:", !!process.env.DID_API_KEY)
      console.error("[D-ID Manual] API Key format:", process.env.DID_API_KEY?.includes(":") ? "Correct (contains colon)" : "Invalid")
      throw new Error("D-ID API connection test failed - check API key and network connectivity")
    }

    // Get presenter configuration based on brand style and current D-ID plan tier
    const presenterSetup = getPresenterConfigForTier(job.brand_style)
    const { config: presenterConfig, useDefaultPresenter, tierInfo } = presenterSetup
    
    await logStep(jobId, "PRESENTER_SELECTED", { 
      ...presenterConfig, 
      brand_style: job.brand_style, 
      useDefaultPresenter,
      didPlanTier: tierInfo.currentTier,
      supportsCustomPresenters: tierInfo.supportsCustomPresenters
    })

    // Create D-ID video with the edited script
    try {
      console.log("[D-ID Manual] Creating D-ID talk with params:", {
        imageUrl: job.image_url,
        scriptLength: script.length,
        presenter: presenterConfig.presenter || "default",
        voice: presenterConfig.voice,
        voiceStyle: presenterConfig.style,
        useDefaultPresenter,
        didPlanTier: tierInfo.currentTier
      })

      const didOptions: any = {
        voice: presenterConfig.voice as any,
        voiceStyle: presenterConfig.style as any,
        useDefaultPresenter,
        expressions: [
          {
            start_frame: 0,
            expression: "neutral",
            intensity: 0.8,
          },
        ],
      }

      // Only add presenter ID if we have premium access and a specific presenter
      if (!useDefaultPresenter && presenterConfig.presenter) {
        didOptions.presenter = presenterConfig.presenter
      }

      const didResponse = await didService.createTalkFromScript(job.image_url, script, didOptions)

      console.log("[D-ID Manual] D-ID talk created successfully:", {
        talkId: didResponse.id,
        status: didResponse.status,
        createdAt: didResponse.created_at,
        createdBy: didResponse.created_by
      })

      await logStep(jobId, "TALK_CREATED", {
        talkId: didResponse.id,
        status: didResponse.status,
        created_at: didResponse.created_at,
        edited_script: true,
      })

      // Update job with pending status and save the edited script
      console.log("[D-ID Manual] Updating job in Supabase with talk ID:", didResponse.id)
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ 
          did_video_url: `pending:${didResponse.id}`,
          openai_avatar_script: script // Save the edited script
        })
        .eq("id", jobId)
      
      if (updateError) {
        console.error("[D-ID Manual] ERROR updating job:", updateError)
        throw updateError
      }
      
      console.log("[D-ID Manual] Job updated successfully with pending talk ID")

      await logStep(jobId, "JOB_UPDATED", { 
        status: "pending", 
        talkId: didResponse.id,
        script_updated: true 
      })

      const response = {
        success: true,
        didData: didResponse,
        talkId: didResponse.id,
        status: didResponse.status,
        message: "Avatar video generation started with your edited script"
      }
      
      console.log("[D-ID Manual] ===== REQUEST COMPLETED SUCCESSFULLY =====")
      console.log("[D-ID Manual] Response:", response)
      
      return NextResponse.json(response)
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