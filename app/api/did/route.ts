import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DIDService } from "@/lib/d-id-service-fixed"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Validate environment variables
if (!process.env.DID_API_KEY) {
  throw new Error("DID_API_KEY environment variable is required")
}

const didService = new DIDService(process.env.DID_API_KEY)

async function logStep(jobId: string, step: string, data: any) {
  console.log(`[D-ID Job ${jobId}] ${step}:`, data)
  try {
    const { error } = await supabase.from("job_logs").insert({
      job_id: jobId,
      step: `DID_${step}`,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    })
    if (error) console.error("Failed to log step:", error)
  } catch (err) {
    console.error("Failed to log step:", err)
  }
}

function getBaseUrl(): string {
  // No longer needed for webhook since we're using polling-only approach
  return "http://localhost:3000"
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
    const { jobId: requestJobId } = await request.json()
    jobId = requestJobId

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    await logStep(jobId, "REQUEST_START", { jobId })

    // Test D-ID connection first
    const connectionTest = await didService.testConnection()
    await logStep(jobId, "CONNECTION_TEST", { connected: connectionTest })

    if (!connectionTest) {
      throw new Error("D-ID API connection test failed - check API key and network connectivity")
    }

    // Get job details
    const { data: job, error: jobError } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || "No job data"}`)
    }

    if (!job.openai_avatar_script) {
      throw new Error("Avatar script not available - ensure OpenAI processing completed successfully")
    }

    await logStep(jobId, "JOB_RETRIEVED", {
      business_name: job.business_name,
      brand_style: job.brand_style,
      image_url: job.image_url,
      script_length: job.openai_avatar_script.length,
    })

    // Get voice configuration based on brand style
    const voiceConfig = getVoiceConfig(job.brand_style)
    await logStep(jobId, "VOICE_SELECTED", { ...voiceConfig, brand_style: job.brand_style })

    const baseUrl = getBaseUrl()

    // Primary attempt with full configuration (no webhook for sustainable polling)
    try {
      const didResponse = await didService.createTalkFromScript(job.image_url, job.openai_avatar_script, {
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
      })

      // Update job with pending status
      await supabase
        .from("jobs")
        .update({ did_video_url: `pending:${didResponse.id}` })
        .eq("id", jobId)

      await logStep(jobId, "JOB_UPDATED", { status: "pending", talkId: didResponse.id })

      return NextResponse.json({
        success: true,
        didData: didResponse,
        talkId: didResponse.id,
        status: didResponse.status,
      })
    } catch (primaryError) {
      await logStep(jobId, "PRIMARY_ATTEMPT_FAILED", {
        error: primaryError.message,
        attempting_fallback: true,
      })

      // Fallback attempt with minimal configuration
      try {
        console.log("Retrying with minimal configuration...")

        const simpleResponse = await didService.createTalkFromScript(job.image_url, job.openai_avatar_script, {
          voice: "en-US-JennyNeural",
          voiceStyle: "Cheerful",
          useDefaultPresenter: true,
          // No webhook for retry to avoid potential webhook issues
        })

        await logStep(jobId, "FALLBACK_TALK_CREATED", {
          talkId: simpleResponse.id,
          status: simpleResponse.status,
          note: "Created without webhook",
        })

        await supabase
          .from("jobs")
          .update({ did_video_url: `pending:${simpleResponse.id}` })
          .eq("id", jobId)

        return NextResponse.json({
          success: true,
          didData: simpleResponse,
          talkId: simpleResponse.id,
          status: simpleResponse.status,
          note: "Created with fallback configuration (no webhook)",
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
    console.error("Error creating D-ID video:", error)

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const talkId = searchParams.get("talkId")

    if (!talkId) {
      return NextResponse.json({ error: "Talk ID is required" }, { status: 400 })
    }

    const talkData = await didService.getTalk(talkId)

    return NextResponse.json({
      success: true,
      talk: talkData,
    })
  } catch (error) {
    console.error("Error fetching D-ID talk:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch talk status",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
