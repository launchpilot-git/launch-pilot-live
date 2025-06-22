import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  console.log("[Test Supabase Write] Starting test...")
  
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Step 1: Initialize Supabase client
    console.log("[Test Supabase Write] Initializing Supabase client...")
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    diagnostics.clientInitialized = true

    // Step 2: Test writing to job_logs table
    console.log("[Test Supabase Write] Testing write to job_logs...")
    const testLogData = {
      job_id: "test-job-" + Date.now(),
      step: "TEST_SUPABASE_CONNECTION",
      data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      timestamp: new Date().toISOString()
    }
    
    const { data: logData, error: logError } = await supabase
      .from("job_logs")
      .insert(testLogData)
      .select()
      .single()
    
    if (logError) {
      diagnostics.logWriteSuccess = false
      diagnostics.logWriteError = logError.message
      console.error("[Test Supabase Write] Error writing to job_logs:", logError)
    } else {
      diagnostics.logWriteSuccess = true
      diagnostics.logRecordId = logData?.id
      console.log("[Test Supabase Write] Successfully wrote to job_logs")
    }

    // Step 3: Test reading back the record
    if (diagnostics.logWriteSuccess && testLogData.job_id) {
      console.log("[Test Supabase Write] Testing read from job_logs...")
      const { data: readData, error: readError } = await supabase
        .from("job_logs")
        .select("*")
        .eq("job_id", testLogData.job_id)
        .single()
      
      if (readError) {
        diagnostics.logReadSuccess = false
        diagnostics.logReadError = readError.message
      } else {
        diagnostics.logReadSuccess = true
        diagnostics.readDataMatches = readData?.job_id === testLogData.job_id
      }
    }

    // Step 4: Test finding a recent job
    console.log("[Test Supabase Write] Testing jobs table access...")
    const { data: recentJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, status, did_video_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
    
    if (jobsError) {
      diagnostics.jobsReadSuccess = false
      diagnostics.jobsReadError = jobsError.message
    } else {
      diagnostics.jobsReadSuccess = true
      diagnostics.recentJobsCount = recentJobs?.length || 0
      diagnostics.recentJobs = recentJobs?.map(job => ({
        id: job.id,
        status: job.status,
        hasDidUrl: !!job.did_video_url,
        didUrlPrefix: job.did_video_url?.substring(0, 30),
        createdAt: job.created_at
      }))
    }

    // Step 5: Test updating a job (if we have one)
    if (recentJobs && recentJobs.length > 0) {
      const testJobId = recentJobs[0].id
      console.log(`[Test Supabase Write] Testing update on job ${testJobId}...`)
      
      const testUpdate = {
        test_field: "test_update_" + Date.now(),
        updated_at: new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from("jobs")
        .update(testUpdate)
        .eq("id", testJobId)
      
      if (updateError) {
        diagnostics.jobUpdateSuccess = false
        diagnostics.jobUpdateError = updateError.message
      } else {
        diagnostics.jobUpdateSuccess = true
        diagnostics.updatedJobId = testJobId
      }
    }

    return NextResponse.json({
      success: diagnostics.logWriteSuccess && diagnostics.jobsReadSuccess,
      message: "Supabase connection test complete",
      diagnostics
    })
    
  } catch (error) {
    console.error("[Test Supabase Write] Unexpected error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}