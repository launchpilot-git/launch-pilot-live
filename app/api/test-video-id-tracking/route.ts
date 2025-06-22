import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  console.log("[Test Video ID Tracking] Starting investigation...")
  
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      investigations: []
    }

    // Investigation 1: Check for jobs with "pending:" prefix
    console.log("[Test Video ID Tracking] Checking for pending D-ID videos...")
    const { data: pendingJobs, error: pendingError } = await supabase
      .from("jobs")
      .select("id, did_video_url, created_at, updated_at")
      .like("did_video_url", "pending:%")
      .order("created_at", { ascending: false })
      .limit(10)
    
    diagnostics.investigations.push({
      name: "PENDING_VIDEOS",
      success: !pendingError,
      error: pendingError?.message,
      count: pendingJobs?.length || 0,
      videos: pendingJobs?.map(j => ({
        jobId: j.id,
        didUrl: j.did_video_url,
        talkId: j.did_video_url?.replace("pending:", ""),
        createdAt: j.created_at,
        updatedAt: j.updated_at,
        ageMinutes: Math.floor((Date.now() - new Date(j.created_at).getTime()) / 60000)
      }))
    })

    // Investigation 2: Check for old D-ID URLs (starting with https://d-id-talks)
    console.log("[Test Video ID Tracking] Checking for completed D-ID videos...")
    const { data: completedJobs, error: completedError } = await supabase
      .from("jobs")
      .select("id, did_video_url, created_at")
      .like("did_video_url", "https://d-id-talks%")
      .order("created_at", { ascending: false })
      .limit(10)
    
    diagnostics.investigations.push({
      name: "COMPLETED_VIDEOS",
      success: !completedError,
      error: completedError?.message,
      count: completedJobs?.length || 0,
      videos: completedJobs?.map(j => {
        // Extract talk ID from URL if possible
        const urlMatch = j.did_video_url?.match(/talks\/([^\/]+)\//)
        return {
          jobId: j.id,
          didUrl: j.did_video_url?.substring(0, 50) + "...",
          extractedTalkId: urlMatch?.[1],
          createdAt: j.created_at
        }
      })
    })

    // Investigation 3: Find jobs created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    console.log("[Test Video ID Tracking] Checking recent jobs (last hour)...")
    const { data: recentJobs, error: recentError } = await supabase
      .from("jobs")
      .select("id, did_video_url, status, created_at, user_id")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
    
    diagnostics.investigations.push({
      name: "RECENT_JOBS",
      success: !recentError,
      error: recentError?.message,
      count: recentJobs?.length || 0,
      jobs: recentJobs?.map(j => ({
        jobId: j.id,
        status: j.status,
        hasDidVideo: !!j.did_video_url,
        didUrlType: j.did_video_url?.startsWith("pending:") ? "pending" : 
                    j.did_video_url?.startsWith("https://") ? "completed" : "other",
        createdAt: j.created_at,
        minutesAgo: Math.floor((Date.now() - new Date(j.created_at).getTime()) / 60000)
      }))
    })

    // Investigation 4: Check job_logs for D-ID related entries
    console.log("[Test Video ID Tracking] Checking recent D-ID logs...")
    const { data: didLogs, error: logsError } = await supabase
      .from("job_logs")
      .select("job_id, step, data, timestamp")
      .or("step.like.%DID%,step.like.%TALK%")
      .order("timestamp", { ascending: false })
      .limit(20)
    
    const logsByJob = didLogs?.reduce((acc: any, log) => {
      if (!acc[log.job_id]) acc[log.job_id] = []
      acc[log.job_id].push({
        step: log.step,
        timestamp: log.timestamp,
        talkId: log.data?.talkId || log.data?.didData?.id
      })
      return acc
    }, {})

    diagnostics.investigations.push({
      name: "DID_LOGS",
      success: !logsError,
      error: logsError?.message,
      uniqueJobs: Object.keys(logsByJob || {}).length,
      recentActivity: Object.entries(logsByJob || {}).slice(0, 5).map(([jobId, logs]: any) => ({
        jobId,
        logCount: logs.length,
        steps: logs.map((l: any) => l.step),
        talkIds: [...new Set(logs.map((l: any) => l.talkId).filter(Boolean))]
      }))
    })

    // Investigation 5: Check for duplicate talk IDs
    if (pendingJobs && pendingJobs.length > 0) {
      const talkIds = pendingJobs
        .map(j => j.did_video_url?.replace("pending:", ""))
        .filter(Boolean)
      
      const duplicates = talkIds.filter((id, index) => talkIds.indexOf(id) !== index)
      
      diagnostics.investigations.push({
        name: "DUPLICATE_TALK_IDS",
        totalPendingTalks: talkIds.length,
        uniqueTalks: new Set(talkIds).size,
        hasDuplicates: duplicates.length > 0,
        duplicates: [...new Set(duplicates)]
      })
    }

    // Analysis
    const issues = []
    
    const pendingVideos = diagnostics.investigations.find(i => i.name === "PENDING_VIDEOS")
    if (pendingVideos?.videos?.some((v: any) => v.ageMinutes > 10)) {
      issues.push("Found pending videos older than 10 minutes - polling may have failed")
    }
    
    const duplicateTalks = diagnostics.investigations.find(i => i.name === "DUPLICATE_TALK_IDS")
    if (duplicateTalks?.hasDuplicates) {
      issues.push("Found duplicate D-ID talk IDs across different jobs")
    }
    
    const recentJobsData = diagnostics.investigations.find(i => i.name === "RECENT_JOBS")
    if (recentJobsData?.jobs?.every((j: any) => !j.hasDidVideo)) {
      issues.push("No recent jobs have D-ID videos - generation may be failing")
    }

    return NextResponse.json({
      success: issues.length === 0,
      message: issues.length === 0 
        ? "No video ID tracking issues detected" 
        : "Found potential issues with video ID tracking",
      issues,
      diagnostics,
      recommendations: issues.length > 0 ? [
        "Check if D-ID polling is running correctly",
        "Verify that new talk IDs are being generated for new jobs",
        "Ensure job updates are happening correctly after D-ID API calls"
      ] : ["Video ID tracking appears to be working correctly"]
    })
    
  } catch (error) {
    console.error("[Test Video ID Tracking] Unexpected error:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}