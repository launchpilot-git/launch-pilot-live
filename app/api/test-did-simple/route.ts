import { type NextRequest, NextResponse } from "next/server"
import { DIDService } from "@/lib/d-id-service"

// Create a new instance of DIDService with the API key
const didService = new DIDService(process.env.DID_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("Testing D-ID with simplified request")

    // Log the API key format (without revealing the actual key)
    const apiKey = process.env.DID_API_KEY || ""
    console.log("API key format check:", {
      length: apiKey.length,
      containsColon: apiKey.includes(":"),
      firstPart: apiKey.split(":")[0]?.substring(0, 5) + "...",
      secondPart: apiKey.split(":")[1] ? apiKey.split(":")[1].substring(0, 3) + "..." : "missing",
    })

    // First test the connection
    const connectionTest = await didService.testConnection()
    console.log("D-ID Connection Test Result:", connectionTest)

    if (!connectionTest) {
      throw new Error("D-ID API connection test failed - check API key format")
    }

    // Use the default presenter image which is guaranteed to work
    const presenterImage = "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg"

    // Use a very simple script
    const script = "Hello, this is a test of the D-ID API."

    // Create a minimal request with no webhook
    const response = await didService.createTalkFromScript(presenterImage, script, {
      voice: "en-US-JennyNeural",
      voiceStyle: "Cheerful",
      useDefaultPresenter: true,
    })

    return NextResponse.json({
      success: true,
      talkId: response.id,
      status: response.status,
      response: response,
    })
  } catch (error) {
    console.error("Error testing D-ID:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
