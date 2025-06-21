import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get recent jobs for this user
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (jobsError) {
      console.error("Jobs error:", jobsError)
      return NextResponse.json({ error: "Failed to fetch jobs", details: jobsError }, { status: 500 })
    }

    // Get profile information
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Profile error:", profileError)
    }

    // Get logs for the most recent job if available
    let logs = null
    if (jobs && jobs.length > 0) {
      const mostRecentJobId = jobs[0].id
      const { data: jobLogs, error: logsError } = await supabase
        .from("job_logs")
        .select("*")
        .eq("job_id", mostRecentJobId)
        .order("timestamp", { ascending: true })

      if (!logsError) {
        logs = jobLogs
      }
    }

    return NextResponse.json({
      userId,
      profile,
      jobs,
      logs,
      timestamp: new Date().toISOString(),
      environment: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasDIDKey: !!process.env.DID_API_KEY,
        hasRunwayKey: !!(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET),
      }
    })
  } catch (error) {
    console.error("Debug error:", error)
    return NextResponse.json({ 
      error: "Debug failed", 
      details: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}