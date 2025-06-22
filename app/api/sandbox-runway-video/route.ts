import { NextRequest, NextResponse } from "next/server"
import RunwayML from "@runwayml/sdk"

const runwayClient = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_TOKEN!,
})

// Helper function to convert base64 data URL to a publicly accessible URL
async function convertImageToRunwayFormat(imageUrl: string): Promise<string> {
  // If it's already a URL, return it
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  
  // If it's a base64 data URL, we need to convert it
  if (imageUrl.startsWith('data:image/')) {
    try {
      console.log("Converting base64 image for Runway")
      
      // Extract the base64 data and mime type
      const [header, base64Data] = imageUrl.split(',')
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
      
      console.log("Image details:", {
        mimeType,
        dataSize: base64Data.length,
        estimatedFileSize: Math.round(base64Data.length * 0.75 / 1024) + 'KB'
      })
      
      // For now, let's try the data URL directly and see what Runway says
      // If this fails, we'll need to implement image upload to a temporary service
      return imageUrl
      
    } catch (error) {
      console.error("Error converting image:", error)
      throw new Error("Failed to process image format")
    }
  }
  
  throw new Error("Unsupported image format - please use HTTP URL or base64 data URL")
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt } = await request.json()

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "imageUrl and prompt are required" },
        { status: 400 }
      )
    }

    console.log("Starting Runway video generation:", { 
      imageUrl: imageUrl.substring(0, 50) + "...", 
      prompt,
      imageType: imageUrl.startsWith('data:') ? 'base64' : 'url'
    })

    // Convert image to Runway-compatible format
    const processedImageUrl = await convertImageToRunwayFormat(imageUrl)
    console.log("Image processed for Runway:", { 
      originalType: imageUrl.startsWith('data:') ? 'base64' : 'url',
      processedType: processedImageUrl.startsWith('data:') ? 'base64' : 'url'
    })

    // Create image-to-video task using the official SDK
    const imageToVideo = await runwayClient.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: processedImageUrl,
      promptText: prompt,
      ratio: "1280:720",
      duration: 5,
    })

    console.log("Runway task created:", { taskId: imageToVideo.id, status: imageToVideo.status })

    // Poll the task until it's complete
    let task = imageToVideo
    let attempts = 0
    const maxAttempts = 60 // 10 minutes max (10 second intervals)

    while (!["SUCCEEDED", "FAILED"].includes(task.status) && attempts < maxAttempts) {
      // Wait for 10 seconds before polling
      await new Promise((resolve) => setTimeout(resolve, 10000))
      attempts++

      console.log(`Polling attempt ${attempts}: Task ${task.id}`)

      try {
        task = await runwayClient.tasks.retrieve(task.id)
        console.log(`Poll ${attempts} response:`, {
          status: task.status,
          hasOutput: !!task.output,
        })

        // Return intermediate status for client-side polling
        if (attempts % 3 === 0) { // Every 30 seconds, send status update
          // We can't send partial responses easily, so we'll just log for now
        }
      } catch (pollError) {
        console.error(`Poll ${attempts} error:`, pollError)
        throw pollError
      }
    }

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0]
      if (videoUrl) {
        console.log("Video generation completed:", { videoUrl })
        return NextResponse.json({ 
          success: true, 
          videoUrl,
          taskId: task.id,
          attempts,
          prompt
        })
      } else {
        throw new Error("No video URL in completed task")
      }
    } else if (task.status === "FAILED") {
      throw new Error(`${task.failureReason || "Video generation failed"}`)
    } else {
      throw new Error("Video generation timed out")
    }

  } catch (error) {
    console.error("Runway video generation error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Enhanced error logging
    console.error("Full error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : imageUrl?.startsWith('http') ? 'url' : 'unknown'
    })
    
    // Check for specific Runway errors
    let userFriendlyError = "Failed to generate video"
    if (errorMessage.includes("Invalid asset aspect ratio") || errorMessage.includes("aspect ratio")) {
      userFriendlyError = "Image aspect ratio is incompatible with Runway (try a more square image)"
    } else if (errorMessage.includes("resolution") || errorMessage.includes("size")) {
      userFriendlyError = "Image resolution too low (try a higher quality image)"
    } else if (errorMessage.includes("format") || errorMessage.includes("type")) {
      userFriendlyError = "Image format not supported (try JPG or PNG)"
    } else if (errorMessage.includes("url") || errorMessage.includes("fetch") || errorMessage.includes("network")) {
      userFriendlyError = "Image URL inaccessible (try uploading the file directly)"
    } else if (errorMessage.includes("API key") || errorMessage.includes("unauthorized")) {
      userFriendlyError = "Runway API configuration issue"
    }
    
    return NextResponse.json(
      {
        error: userFriendlyError,
        details: errorMessage,
        debugInfo: {
          imageType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
          promptLength: prompt?.length || 0
        }
      },
      { status: 500 }
    )
  }
}

// GET method to check status of a task
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      )
    }

    const task = await runwayClient.tasks.retrieve(taskId)
    
    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        output: task.output,
        failureReason: task.failureReason
      }
    })

  } catch (error) {
    console.error("Task status check error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return NextResponse.json(
      {
        error: "Failed to check task status",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}