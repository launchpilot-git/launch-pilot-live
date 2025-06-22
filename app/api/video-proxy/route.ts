import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DIDService } from "@/lib/d-id-service-fixed"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize D-ID service with error handling
let didService: DIDService | null = null
try {
  if (!process.env.DID_API_KEY) {
    console.error("[Video Proxy] DID_API_KEY environment variable is not set")
  } else {
    didService = new DIDService(process.env.DID_API_KEY)
    console.log("[Video Proxy] D-ID service initialized successfully")
  }
} catch (error) {
  console.error("[Video Proxy] Failed to initialize D-ID service:", error)
}

// Extract talk ID from D-ID URL
function extractTalkId(url: string): string | null {
  const match = url.match(/\/tlk_([^\/]+)\//)
  return match ? match[1] : null
}

export async function GET(request: NextRequest) {
  try {
    // Get the video URL from the query parameters
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")
    const jobId = searchParams.get("jobId") // Optional job ID for database updates

    console.log("[Video Proxy] Request received:", {
      url: videoUrl,
      jobId: jobId,
      timestamp: new Date().toISOString()
    })

    if (!videoUrl) {
      console.error("[Video Proxy] No video URL provided")
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(videoUrl)
    console.log("[Video Proxy] Decoded URL:", decodedUrl)

    // Fetch the video from the original source
    console.log("[Video Proxy] Fetching video from original source...")
    const response = await fetch(decodedUrl)
    console.log("[Video Proxy] Response status:", response.status, response.statusText)
    
    // Handle expired D-ID URLs (403 Forbidden)
    if (response.status === 403 && decodedUrl.includes("d-id")) {
      console.log("[Video Proxy] D-ID video URL expired (403), attempting to refresh...")
      
      // Extract talk ID from the URL
      const talkId = extractTalkId(decodedUrl)
      console.log("[Video Proxy] Extracted talk ID:", talkId)
      
      if (!talkId) {
        console.error("[Video Proxy] Could not extract talk ID from URL:", decodedUrl)
        return NextResponse.json(
          { error: "Could not extract talk ID from expired URL" },
          { status: 400 }
        )
      }

      // Check if D-ID service is available
      if (!didService) {
        console.error("[Video Proxy] D-ID service is not initialized")
        return NextResponse.json(
          { error: "D-ID service unavailable" },
          { status: 500 }
        )
      }

      // Refresh the video URL
      console.log("[Video Proxy] Calling D-ID service to refresh video URL...")
      
      try {
        const newUrl = await didService.refreshVideoUrl(talkId)
        console.log("[Video Proxy] D-ID refresh response:", newUrl ? "Success" : "Failed")
        
        if (!newUrl) {
          console.error("[Video Proxy] Failed to refresh video URL for talk ID:", talkId)
          
          // Update the job to indicate the video has expired
          if (jobId) {
            const { error: updateError } = await supabase
              .from("jobs")
              .update({ 
                did_video_url: "expired:video_not_found",
                updated_at: new Date().toISOString()
              })
              .eq("id", jobId)
              
            if (updateError) {
              console.error("[Video Proxy] Failed to update job with expired status:", updateError)
            } else {
              console.log(`[Video Proxy] Updated job ${jobId} with expired video status`)
            }
          }
          
          return NextResponse.json(
            { error: "Video has expired and is no longer available. Please regenerate the video." },
            { status: 410 } // 410 Gone - indicates the resource is no longer available
          )
        }

        // Update the database if we have a job ID
        if (jobId) {
          const { error: updateError } = await supabase
            .from("jobs")
            .update({ did_video_url: newUrl })
            .eq("id", jobId)

          if (updateError) {
            console.error("Failed to update job with new video URL:", updateError)
          } else {
            console.log(`Updated job ${jobId} with refreshed video URL`)
          }
        }

        // Try fetching the video with the new URL
        const newResponse = await fetch(newUrl)
        if (!newResponse.ok) {
          return NextResponse.json(
            { error: `Failed to fetch refreshed video: ${newResponse.statusText}` },
            { status: newResponse.status }
          )
        }

        // Get the video data as an array buffer
        const videoData = await newResponse.arrayBuffer()

        // Create a new response with the video data and appropriate headers
        return new NextResponse(videoData, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=3600",
            "X-Video-Refreshed": "true", // Indicate that the URL was refreshed
          },
        })
      } catch (error) {
        console.error("[Video Proxy] Error refreshing D-ID video:", error)
        return NextResponse.json(
          { error: "Failed to refresh video URL", details: error instanceof Error ? error.message : "Unknown error" },
          { status: 500 }
        )
      }
    }
    
    if (!response.ok) {
      console.error("[Video Proxy] Failed to fetch video:", {
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl
      })
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the video data as an array buffer
    console.log("[Video Proxy] Fetching video data...")
    const videoData = await response.arrayBuffer()
    console.log("[Video Proxy] Video data size:", videoData.byteLength, "bytes")

    // Create a new response with the video data and appropriate headers
    return new NextResponse(videoData, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline", // This is the key header that makes the browser play the video instead of downloading it
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[Video Proxy] Error in video proxy:", error)
    console.error("[Video Proxy] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: "Failed to proxy video", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
