import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import RunwayML from "@runwayml/sdk"

// Use environment variables for Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Initialize Runway ML client with environment variable
const runwayClient = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()

    // Get job details
    const { data: job, error: jobError } = await supabase.from("jobs").select("*").eq("id", jobId).single()

    if (jobError || !job) {
      throw new Error("Job not found")
    }

    if (!job.openai_cinematic_script) {
      throw new Error("Cinematic script not available")
    }

    console.log(`Creating Runway video for job ${jobId}`)

    // Create Runway video using the official SDK
    const imageToVideo = await runwayClient.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: job.image_url,
      promptText: job.openai_cinematic_script,
      ratio: "1280:720", // Updated ratio format for API version 2024-11-06
      duration: 5,
    })

    console.log(`Runway video creation initiated for job ${jobId}:`, imageToVideo)

    // Update job with Runway generation ID (temporary until completion)
    await supabase
      .from("jobs")
      .update({ promo_video_url: `pending:${imageToVideo.id}` })
      .eq("id", jobId)

    // Poll the task until it's complete
    let task = imageToVideo
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (!["SUCCEEDED", "FAILED"].includes(task.status) && attempts < maxAttempts) {
      // Wait for 10 seconds before polling
      await new Promise((resolve) => setTimeout(resolve, 10000))
      attempts++

      try {
        task = await runwayClient.tasks.retrieve(task.id)
        console.log(`Polling attempt ${attempts} for job ${jobId}: ${task.status}`)
      } catch (pollError) {
        console.error(`Polling error for job ${jobId}, attempt ${attempts}:`, pollError)
        throw pollError
      }
    }

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0]
      if (videoUrl) {
        // Update job with the final video URL
        await supabase.from("jobs").update({ promo_video_url: videoUrl }).eq("id", jobId)
        console.log(`Runway video completed for job ${jobId}: ${videoUrl}`)
        return NextResponse.json({ success: true, videoUrl, runwayData: task })
      } else {
        throw new Error("No video URL in completed task")
      }
    } else if (task.status === "FAILED") {
      throw new Error(`Runway task failed: ${task.failureReason || "Unknown error"}`)
    } else {
      throw new Error("Runway task timed out")
    }
  } catch (error) {
    console.error("Error creating promo video:", error)

    // Set a placeholder video URL if Runway fails
    const { jobId } = await request.json()
    await supabase
      .from("jobs")
      .update({
        promo_video_url: "https://example.com/promo-video-placeholder.mp4",
      })
      .eq("id", jobId)

    return NextResponse.json(
      {
        error: "Failed to create promo video",
        details: error.message,
        errorType: error.constructor.name,
      },
      { status: 500 },
    )
  }
}
