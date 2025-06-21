import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get the video URL from the query parameters
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")

    if (!videoUrl) {
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(videoUrl)

    // Fetch the video from the original source
    const response = await fetch(decodedUrl)
    
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
