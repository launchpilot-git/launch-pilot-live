import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Testing D-ID with FREE PLAN compatible request")

    const apiKey = process.env.DID_API_KEY
    if (!apiKey) {
      throw new Error("DID_API_KEY environment variable is missing")
    }

    // Ultra-simple request for FREE plan
    const freeRequest = {
      source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
      script: {
        type: "text",
        input: "Hello world"
      }
    }

    console.log("Free plan request:", JSON.stringify(freeRequest, null, 2))

    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`

    // Add delay to avoid rate limiting
    console.log("Waiting 2 seconds to avoid rate limiting...")
    await new Promise(resolve => setTimeout(resolve, 2000))

    const response = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(freeRequest),
    })

    const responseText = await response.text()
    console.log("D-ID Response Status:", response.status)
    console.log("D-ID Response Body:", responseText)

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `D-ID API error (${response.status})`,
          response: responseText,
          plan: "FREE",
          suggestion: response.status === 500 
            ? "Free plan limitations likely causing 500 error. Try upgrading to paid plan."
            : "Other API error"
        },
        { status: response.status }
      )
    }

    const responseData = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      message: "FREE PLAN REQUEST WORKED!",
      talkId: responseData.id,
      status: responseData.status,
      plan: "FREE",
      response: responseData,
    })
  } catch (error) {
    console.error("Error testing D-ID free plan:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        plan: "FREE",
        suggestion: "Try upgrading to paid plan if free plan limitations are causing issues"
      },
      { status: 500 }
    )
  }
}
