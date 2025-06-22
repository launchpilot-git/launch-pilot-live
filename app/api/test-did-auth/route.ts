import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.DID_API_KEY
    
    // Basic diagnostics
    const diagnostics = {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyFormat: {
        containsColon: apiKey?.includes(":") || false,
        firstPart: apiKey?.split(":")[0]?.substring(0, 10) + "..." || "missing",
        isExpectedKey: apiKey?.startsWith("bGF1bmNocGlsb3Qx") || false // Check if it's the new key
      },
      timestamp: new Date().toISOString(),
      deploymentVersion: "v2" // Force redeployment
    }

    if (!apiKey) {
      return NextResponse.json({
        error: "DID_API_KEY not configured",
        diagnostics
      }, { status: 500 })
    }

    // Test 1: Basic API connectivity
    console.log("[Test D-ID] Testing API connectivity...")
    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`
    
    const testResponse = await fetch("https://api.d-id.com/talks", {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      }
    })

    diagnostics.apiTest = {
      status: testResponse.status,
      statusText: testResponse.statusText,
      success: [200, 401, 403].includes(testResponse.status) // These all indicate auth is working
    }

    // Test 2: Try to create a minimal test talk
    if (testResponse.status === 200 || testResponse.status === 401) {
      console.log("[Test D-ID] Attempting to create test talk...")
      
      const testTalkResponse = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
          script: {
            type: "text",
            input: "Hello, this is a test of the D-ID API.",
            provider: {
              type: "microsoft",
              voice_id: "en-US-JennyNeural"
            }
          },
          config: {
            stitch: true
          }
        })
      })

      const responseText = await testTalkResponse.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { rawText: responseText }
      }

      diagnostics.createTalkTest = {
        status: testTalkResponse.status,
        statusText: testTalkResponse.statusText,
        success: testTalkResponse.status === 201,
        response: responseData
      }

      // If we get a 402 Payment Required, it might be a quota issue
      if (testTalkResponse.status === 402) {
        diagnostics.possibleIssue = "API quota exceeded or billing issue"
      }
    }

    return NextResponse.json({
      message: "D-ID API diagnostic complete",
      diagnostics,
      recommendation: diagnostics.apiKeyFormat.isExpectedKey 
        ? "Using correct production API key" 
        : "WARNING: Not using the expected production API key!"
    })

  } catch (error) {
    console.error("[Test D-ID] Error:", error)
    return NextResponse.json({
      error: "Failed to test D-ID API",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}