import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DIDService } from "@/lib/d-id-service-fixed"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize D-ID service
const didService = new DIDService(process.env.DID_API_KEY!)

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

    if (!videoUrl) {
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(videoUrl)

    // Fetch the video from the original source
    const response = await fetch(decodedUrl)
    
    // Handle expired D-ID URLs (403 Forbidden)
    if (response.status === 403 && decodedUrl.includes("d-id")) {
      console.log("D-ID video URL expired, attempting to refresh...")
      
      // Extract talk ID from the URL
      const talkId = extractTalkId(decodedUrl)
      if (!talkId) {
        return NextResponse.json(
          { error: "Could not extract talk ID from expired URL" },
          { status: 400 }
        )
      }

      // Refresh the video URL
      const newUrl = await didService.refreshVideoUrl(talkId)
      if (!newUrl) {
        return NextResponse.json(
          { error: "Failed to refresh video URL" },
          { status: 500 }
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
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the video data as an array buffer
    const videoData = await response.arrayBuffer()

    // Create a new response with the video data and appropriate headers
    return new NextResponse(videoData, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline", // This is the key header that makes the browser play the video instead of downloading it
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error in video proxy:", error)
    return NextResponse.json(
      { error: "Failed to proxy video" },
      { status: 500 }
    )
  }
}
