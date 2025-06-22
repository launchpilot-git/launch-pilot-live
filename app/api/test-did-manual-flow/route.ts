import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  console.log("[Test D-ID Manual Flow] Starting test...")
  
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      steps: []
    }

    // Step 1: Find a recent job with avatar script
    console.log("[Test D-ID Manual Flow] Finding recent job with avatar script...")
    const { data: recentJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, user_id, openai_avatar_script, did_video_url, business_name, image_url, brand_style, created_at")
      .not("openai_avatar_script", "is", null)
      .order("created_at", { ascending: false })
      .limit(5)
    
    diagnostics.steps.push({
      step: "FIND_RECENT_JOBS",
      success: !jobsError,
      error: jobsError?.message,
      jobsFound: recentJobs?.length || 0,
      jobs: recentJobs?.map(j => ({
        id: j.id,
        hasScript: !!j.openai_avatar_script,
        scriptLength: j.openai_avatar_script?.length,
        didVideoUrl: j.did_video_url,
        createdAt: j.created_at
      }))
    })

    if (!recentJobs || recentJobs.length === 0) {
      return NextResponse.json({
        message: "No jobs with avatar scripts found",
        diagnostics
      })
    }

    const testJob = recentJobs[0]
    console.log("[Test D-ID Manual Flow] Using job:", testJob.id)

    // Step 2: Simulate the avatar script editor flow
    console.log("[Test D-ID Manual Flow] Simulating script editor submission...")
    const testScript = testJob.openai_avatar_script || "Test script for avatar video generation."
    
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/did-manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth header if needed
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          jobId: testJob.id,
          script: testScript + " [TEST EDIT]" // Add marker to track this specific test
        })
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { rawText: responseText }
      }

      diagnostics.steps.push({
        step: "CALL_DID_MANUAL",
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        response: responseData
      })

      // Step 3: Check if job was updated with new talk ID
      if (response.ok && responseData.talkId) {
        console.log("[Test D-ID Manual Flow] Checking job update...")
        const { data: updatedJob, error: updateError } = await supabase
          .from("jobs")
          .select("did_video_url, openai_avatar_script")
          .eq("id", testJob.id)
          .single()
        
        diagnostics.steps.push({
          step: "VERIFY_JOB_UPDATE",
          success: !updateError,
          error: updateError?.message,
          oldDidUrl: testJob.did_video_url,
          newDidUrl: updatedJob?.did_video_url,
          expectedUrl: `pending:${responseData.talkId}`,
          urlMatches: updatedJob?.did_video_url === `pending:${responseData.talkId}`,
          scriptUpdated: updatedJob?.openai_avatar_script?.includes("[TEST EDIT]")
        })
      }

      // Step 4: Check job_logs for this operation
      console.log("[Test D-ID Manual Flow] Checking job logs...")
      const { data: logs, error: logsError } = await supabase
        .from("job_logs")
        .select("step, data, timestamp")
        .eq("job_id", testJob.id)
        .like("step", "DID_MANUAL_%")
        .order("timestamp", { ascending: false })
        .limit(10)
      
      diagnostics.steps.push({
        step: "CHECK_JOB_LOGS",
        success: !logsError,
        error: logsError?.message,
        logsFound: logs?.length || 0,
        recentLogs: logs?.map(l => ({
          step: l.step,
          timestamp: l.timestamp,
          dataPreview: JSON.stringify(l.data).substring(0, 100) + "..."
        }))
      })

    } catch (error) {
      diagnostics.steps.push({
        step: "CALL_DID_MANUAL",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }

    // Summary
    const allStepsSuccessful = diagnostics.steps.every(s => s.success !== false)
    
    return NextResponse.json({
      success: allStepsSuccessful,
      message: allStepsSuccessful 
        ? "D-ID manual flow test completed successfully" 
        : "D-ID manual flow test encountered issues",
      diagnostics,
      recommendation: allStepsSuccessful
        ? "The avatar script editor flow appears to be working correctly"
        : "Check the failed steps above for specific issues"
    })
    
  } catch (error) {
    console.error("[Test D-ID Manual Flow] Unexpected error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}