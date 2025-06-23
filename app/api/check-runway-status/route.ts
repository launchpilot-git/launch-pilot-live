import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 })
    }
    
    // Get the current job status
    const { data: job, error } = await supabase
      .from("jobs")
      .select("promo_video_url, created_at")
      .eq("id", jobId)
      .single()
    
    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    
    // Check if promo video status changed from pending to complete/failed
    const isComplete = job.promo_video_url && 
                      !job.promo_video_url.startsWith('pending:') &&
                      job.promo_video_url !== 'pending:runway_processing'
    
    return NextResponse.json({
      success: true,
      jobId,
      status: isComplete ? 'complete' : 'pending',
      promo_video_url: job.promo_video_url,
      created_at: job.created_at
    })
  } catch (error) {
    console.error("Error checking Runway status:", error)
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    )
  }
}