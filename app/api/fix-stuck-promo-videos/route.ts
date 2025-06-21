import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use environment variables for Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log("[fix-stuck-promo-videos] Starting check for stuck promo videos");
    
    // Find all jobs with stuck promo videos (pending for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckJobs, error } = await supabase
      .from("jobs")
      .select("id, promo_video_url, created_at")
      .like("promo_video_url", "pending:%")
      .lt("created_at", tenMinutesAgo);

    if (error) {
      console.error("[fix-stuck-promo-videos] Error fetching stuck jobs:", error);
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log("[fix-stuck-promo-videos] No stuck promo videos found");
      return NextResponse.json({ 
        success: true, 
        message: "No stuck promo videos found", 
        fixed: 0 
      });
    }

    console.log(`[fix-stuck-promo-videos] Found ${stuckJobs.length} stuck promo videos:`, 
      stuckJobs.map(j => ({ id: j.id, url: j.promo_video_url })));
    
    // Fix stuck videos by setting them to placeholder
    const fixes = await Promise.all(
      stuckJobs.map(async (job) => {
        try {
          console.log(`[fix-stuck-promo-videos] Fixing job ${job.id} with URL: ${job.promo_video_url}`);
          
          const { error: updateError } = await supabase
            .from("jobs")
            .update({
              promo_video_url: "https://example.com/promo-video-placeholder.mp4",
            })
            .eq("id", job.id);
          
          if (updateError) {
            throw updateError;
          }
          
          return {
            jobId: job.id,
            status: "fixed",
            previousUrl: job.promo_video_url,
            newUrl: "https://example.com/promo-video-placeholder.mp4",
          };
        } catch (error: any) {
          console.error(`[fix-stuck-promo-videos] Error fixing job ${job.id}:`, error);
          return {
            jobId: job.id,
            status: "error",
            error: error.message,
          };
        }
      })
    );
    
    const fixed = fixes.filter(f => f.status === "fixed").length;
    const errors = fixes.filter(f => f.status === "error").length;
    
    console.log(`[fix-stuck-promo-videos] Fixed ${fixed} jobs, ${errors} errors`);
    
    return NextResponse.json({
      success: true,
      fixed,
      errors,
      results: fixes,
    });
  } catch (error: any) {
    console.error("[fix-stuck-promo-videos] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}