import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use environment variables for Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function logStep(jobId: string, step: string, data: any) {
  console.log(`[Job ${jobId}] ${step}:`, data)
  try {
    const { error } = await supabase.from("job_logs").insert({
      job_id: jobId,
      step,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    })
    if (error) console.error("Failed to log step:", error)
  } catch (err) {
    console.error("Failed to log step:", err)
  }
}

interface DIDWebhookPayload {
  id: string
  status: "created" | "started" | "done" | "error"
  result_url?: string
  error?: string
  webhook_data?: {
    jobId: string
    videoType: string
  }
}

interface RunwayWebhookPayload {
  id: string
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"
  output?: string[]
  webhook_data?: {
    jobId: string
    videoType: string
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Webhook received")
    const body = await request.json()
    console.log("Webhook body:", JSON.stringify(body, null, 2))

    let jobId: string | null = null
    let videoType: string | null = null
    let videoUrl: string | null = null
    let isError = false
    let errorMessage: string | null = null

    // Handle D-ID webhook format
    if (body.id && body.id.startsWith("tlk_")) {
      const didPayload = body as DIDWebhookPayload

      if (didPayload.webhook_data) {
        jobId = didPayload.webhook_data.jobId
        videoType = didPayload.webhook_data.videoType
      }

      await logStep(jobId || "unknown", "DID_WEBHOOK_RECEIVED", {
        talkId: didPayload.id,
        status: didPayload.status,
        hasResultUrl: !!didPayload.result_url,
        hasError: !!didPayload.error,
      })

      if (didPayload.status === "error") {
        isError = true
        errorMessage = didPayload.error || "Unknown D-ID error"
      } else if (didPayload.status === "done" && didPayload.result_url) {
        videoUrl = didPayload.result_url
      } else {
        // Status is "created" or "started" - no action needed
        return NextResponse.json({ success: true, status: "processing" })
      }
    }
    // Handle Runway webhook format
    else if (body.status && ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"].includes(body.status)) {
      const runwayPayload = body as RunwayWebhookPayload

      if (runwayPayload.webhook_data) {
        jobId = runwayPayload.webhook_data.jobId
        videoType = runwayPayload.webhook_data.videoType
      }

      await logStep(jobId || "unknown", "RUNWAY_WEBHOOK_RECEIVED", {
        taskId: runwayPayload.id,
        status: runwayPayload.status,
        hasOutput: !!runwayPayload.output,
      })

      if (runwayPayload.status === "FAILED") {
        isError = true
        errorMessage = "Runway video generation failed"
      } else if (runwayPayload.status === "SUCCEEDED" && runwayPayload.output && runwayPayload.output.length > 0) {
        videoUrl = runwayPayload.output[0]
      } else {
        // Status is "PENDING" or "RUNNING" - no action needed
        return NextResponse.json({ success: true, status: "processing" })
      }
    }
    // Handle custom format (for testing)
    else if (body.jobId && body.videoType && (body.videoUrl || body.error)) {
      jobId = body.jobId as string
      videoType = body.videoType as string
      videoUrl = body.videoUrl
      isError = !!body.error
      errorMessage = body.error

      await logStep(jobId || "unknown", "CUSTOM_WEBHOOK_RECEIVED", {
        videoType,
        videoUrl,
        isError,
        errorMessage,
      })
    } else {
      console.error("Unknown webhook format:", body)
      return NextResponse.json({ error: "Invalid webhook format" }, { status: 400 })
    }

    // Validate required fields
    if (!jobId || !videoType) {
      console.error("Missing required fields in webhook", { jobId, videoType })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Handle errors
    if (isError) {
      await logStep(jobId, "VIDEO_ERROR_HANDLED", {
        videoType,
        error: errorMessage,
      })

      // Update job with placeholder video
      const placeholderUrl =
        videoType === "avatar"
          ? "https://example.com/avatar-video-placeholder.mp4"
          : "https://example.com/promo-video-placeholder.mp4"

      if (videoType === "avatar") {
        await supabase.from("jobs").update({ did_video_url: placeholderUrl }).eq("id", jobId)
      } else if (videoType === "promo") {
        await supabase.from("jobs").update({ promo_video_url: placeholderUrl }).eq("id", jobId)
      }

      return NextResponse.json({ success: true, handled: "error", placeholderUsed: true })
    }

    // Validate video URL for success case
    if (!videoUrl) {
      console.error("No video URL provided for successful webhook", { jobId, videoType })
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
    }

    // Update job with video URL
    if (videoType === "avatar") {
      // First check if the job exists and get its current status
      const { data: jobData } = await supabase.from("jobs").select("did_video_url").eq("id", jobId).single()
      
      // Only update if the job exists and either has no URL or has a pending URL
      if (jobData && (!jobData.did_video_url || jobData.did_video_url.startsWith("pending:"))) {
        await supabase.from("jobs").update({ did_video_url: videoUrl }).eq("id", jobId)
        await logStep(jobId, "AVATAR_VIDEO_UPDATED", { videoUrl, previousUrl: jobData.did_video_url })
      } else {
        await logStep(jobId, "AVATAR_VIDEO_UPDATE_SKIPPED", { reason: "Job not found or URL already set", videoUrl })
      }
    } else if (videoType === "promo") {
      // First check if the job exists and get its current status
      const { data: jobData } = await supabase.from("jobs").select("promo_video_url").eq("id", jobId).single()
      
      // Only update if the job exists and either has no URL or has a pending URL
      if (jobData && (!jobData.promo_video_url || jobData.promo_video_url.startsWith("pending:"))) {
        await supabase.from("jobs").update({ promo_video_url: videoUrl }).eq("id", jobId)
        await logStep(jobId, "PROMO_VIDEO_UPDATED", { videoUrl, previousUrl: jobData.promo_video_url })
      } else {
        await logStep(jobId, "PROMO_VIDEO_UPDATE_SKIPPED", { reason: "Job not found or URL already set", videoUrl })
      }
    } else {
      return NextResponse.json({ error: "Invalid video type" }, { status: 400 })
    }

    // Check if both videos are ready and update status if needed
    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (job) {
      const didVideoReady = job.did_video_url && !job.did_video_url.startsWith("pending:")
      const promoVideoReady = job.promo_video_url && !job.promo_video_url.startsWith("pending:")

      if (didVideoReady && promoVideoReady && job.status !== "complete") {
        await supabase.from("jobs").update({ status: "complete" }).eq("id", jobId)
        await logStep(jobId, "JOB_COMPLETED", { allVideosReady: true })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
