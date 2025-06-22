import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  console.log("[Test Full Avatar Flow] Starting comprehensive test...")
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: [] as any[],
    success: false,
    summary: ""
  }

  try {
    // Step 1: Find a recent Pro user
    console.log("[Test Full Avatar Flow] Step 1: Finding Pro user...")
    const { data: proUsers, error: userError } = await supabase
      .from("profiles")
      .select("id, email, plan")
      .eq("plan", "pro")
      .limit(1)
    
    if (!proUsers || proUsers.length === 0) {
      results.steps.push({
        step: "FIND_PRO_USER",
        success: false,
        error: "No Pro users found in database"
      })
      results.summary = "Test cannot proceed - no Pro users available"
      return NextResponse.json(results)
    }

    const testUser = proUsers[0]
    results.steps.push({
      step: "FIND_PRO_USER",
      success: true,
      userId: testUser.id,
      userEmail: testUser.email
    })

    // Step 2: Simulate job creation (what happens when user submits form)
    console.log("[Test Full Avatar Flow] Step 2: Creating test job...")
    const testJobData = {
      user_id: testUser.id,
      image_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
      business_name: "Test Business " + Date.now(),
      industry: "technology",
      brand_style: "professional",
      status: "processing",
      created_at: new Date().toISOString()
    }

    const { data: newJob, error: jobError } = await supabase
      .from("jobs")
      .insert(testJobData)
      .select()
      .single()

    if (jobError || !newJob) {
      results.steps.push({
        step: "CREATE_JOB",
        success: false,
        error: jobError?.message
      })
      return NextResponse.json(results)
    }

    results.steps.push({
      step: "CREATE_JOB",
      success: true,
      jobId: newJob.id,
      status: newJob.status
    })

    // Step 3: Simulate process-job API call
    console.log("[Test Full Avatar Flow] Step 3: Calling process-job API...")
    const processResponse = await fetch(`${request.nextUrl.origin}/api/process-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ jobId: newJob.id })
    })

    const processResult = await processResponse.json()
    results.steps.push({
      step: "PROCESS_JOB",
      success: processResponse.ok,
      status: processResponse.status,
      response: processResult
    })

    // Step 4: Check job status after processing
    console.log("[Test Full Avatar Flow] Step 4: Checking job after processing...")
    const { data: processedJob, error: checkError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", newJob.id)
      .single()

    const avatarStatus = processedJob?.did_video_url === "script_ready" ? "✅ CORRECT" : "❌ WRONG"
    
    results.steps.push({
      step: "CHECK_PROCESSED_JOB",
      success: !checkError,
      status: processedJob?.status,
      did_video_url: processedJob?.did_video_url,
      avatarScriptGenerated: !!processedJob?.openai_avatar_script,
      avatarScriptPreview: processedJob?.openai_avatar_script?.substring(0, 50) + "...",
      avatarStatusCheck: avatarStatus,
      expectedValue: "script_ready",
      actualValue: processedJob?.did_video_url
    })

    // Step 5: Simulate user editing script and clicking generate
    if (processedJob?.did_video_url === "script_ready") {
      console.log("[Test Full Avatar Flow] Step 5: Simulating avatar generation...")
      
      const editedScript = (processedJob.openai_avatar_script || "Test script") + " [Edited by user]"
      
      const avatarResponse = await fetch(`${request.nextUrl.origin}/api/did-manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          jobId: newJob.id,
          script: editedScript
        })
      })

      const avatarResult = await avatarResponse.json()
      results.steps.push({
        step: "GENERATE_AVATAR",
        success: avatarResponse.ok,
        status: avatarResponse.status,
        response: avatarResult,
        talkId: avatarResult?.talkId
      })

      // Step 6: Verify job was updated with pending talk ID
      const { data: finalJob, error: finalError } = await supabase
        .from("jobs")
        .select("did_video_url, openai_avatar_script")
        .eq("id", newJob.id)
        .single()

      const expectedUrl = avatarResult?.talkId ? `pending:${avatarResult.talkId}` : null
      const urlMatches = finalJob?.did_video_url === expectedUrl

      results.steps.push({
        step: "VERIFY_FINAL_STATE",
        success: !finalError && urlMatches,
        did_video_url: finalJob?.did_video_url,
        expectedUrl: expectedUrl,
        urlMatches: urlMatches,
        scriptWasUpdated: finalJob?.openai_avatar_script?.includes("[Edited by user]")
      })
    }

    // Step 7: Check job logs
    console.log("[Test Full Avatar Flow] Step 7: Checking job logs...")
    const { data: logs, error: logsError } = await supabase
      .from("job_logs")
      .select("step, timestamp")
      .eq("job_id", newJob.id)
      .order("timestamp", { ascending: true })

    results.steps.push({
      step: "CHECK_LOGS",
      success: !logsError,
      logCount: logs?.length || 0,
      logSteps: logs?.map(l => l.step) || []
    })

    // Cleanup: Delete test job
    await supabase.from("jobs").delete().eq("id", newJob.id)
    await supabase.from("job_logs").delete().eq("job_id", newJob.id)

    // Analysis
    const allStepsSuccessful = results.steps.every(s => s.success !== false)
    const flowWorking = results.steps.find(s => s.step === "CHECK_PROCESSED_JOB")?.avatarStatusCheck === "✅ CORRECT"
    
    results.success = allStepsSuccessful && flowWorking
    results.summary = flowWorking
      ? "✅ Avatar flow is working correctly! Jobs start with 'script_ready' status as expected."
      : "❌ Avatar flow has issues - jobs are not getting 'script_ready' status"

    return NextResponse.json(results)
    
  } catch (error) {
    results.steps.push({
      step: "UNEXPECTED_ERROR",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
    results.summary = "Test failed with unexpected error"
    return NextResponse.json(results, { status: 500 })
  }
}