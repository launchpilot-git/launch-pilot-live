import { NextRequest, NextResponse } from "next/server"
import { DIDService } from "@/lib/d-id-service-fixed"

export async function GET(request: NextRequest) {
  console.log("[Test D-ID Connection] Starting test...")
  
  try {
    // Step 1: Check API key
    const apiKey = process.env.DID_API_KEY
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 20) + "...",
      apiKeyContainsColon: apiKey?.includes(":") || false
    }
    
    if (!apiKey) {
      return NextResponse.json({
        error: "DID_API_KEY not configured",
        diagnostics
      }, { status: 500 })
    }

    // Step 2: Initialize D-ID service
    console.log("[Test D-ID Connection] Initializing D-ID service...")
    let didService: DIDService
    try {
      didService = new DIDService(apiKey)
      diagnostics.serviceInitialized = true
    } catch (error) {
      diagnostics.serviceInitialized = false
      diagnostics.initError = error instanceof Error ? error.message : "Unknown error"
      return NextResponse.json({ error: "Failed to initialize D-ID service", diagnostics }, { status: 500 })
    }

    // Step 3: Test creating a talk
    console.log("[Test D-ID Connection] Creating test talk...")
    try {
      const testTalk = await didService.createTalkFromScript(
        "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
        "Hello, this is a test of the D-ID API integration.",
        {
          voice: "en-US-JennyNeural",
          useDefaultPresenter: true
        }
      )
      
      diagnostics.talkCreated = true
      diagnostics.talkId = testTalk.id
      diagnostics.talkStatus = testTalk.status
      diagnostics.createdBy = testTalk.created_by
      
      console.log("[Test D-ID Connection] Talk created:", testTalk.id)
      
      // Step 4: Try to retrieve the talk
      console.log("[Test D-ID Connection] Retrieving talk...")
      const retrievedTalk = await didService.getTalk(testTalk.id)
      
      diagnostics.talkRetrieved = true
      diagnostics.retrievedStatus = retrievedTalk.status
      diagnostics.hasResultUrl = !!retrievedTalk.result_url
      
    } catch (error) {
      diagnostics.talkCreated = false
      diagnostics.createError = error instanceof Error ? error.message : "Unknown error"
      console.error("[Test D-ID Connection] Error creating talk:", error)
    }

    return NextResponse.json({
      success: diagnostics.talkCreated || false,
      message: diagnostics.talkCreated 
        ? "D-ID connection test successful!" 
        : "D-ID connection test failed",
      diagnostics
    })
    
  } catch (error) {
    console.error("[Test D-ID Connection] Unexpected error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}