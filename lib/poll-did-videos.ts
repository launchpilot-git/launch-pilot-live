import { createClient } from "@supabase/supabase-js";
import { DIDService } from "./d-id-service-fixed";

// Use environment variables for Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const didService = new DIDService(process.env.DID_API_KEY!);

async function logStep(jobId: string, step: string, data: any) {
  console.log(`[Job ${jobId}] ${step}:`, data);
  try {
    const { error } = await supabase.from("job_logs").insert({
      job_id: jobId,
      step,
      data: JSON.stringify(data),
      timestamp: new Date().toISOString(),
    });
    if (error) console.error("Failed to log step:", error);
  } catch (err) {
    console.error("Failed to log step:", err);
  }
}

export async function pollPendingDIDVideos(options?: { maxRetries?: number; timeout?: number }) {
  const { maxRetries = 3, timeout = 30000 } = options || {};
  
  console.log(`[pollPendingDIDVideos] Starting poll at ${new Date().toISOString()}`);
  
  try {
    // Find all jobs with pending videos OR recently completed Runway videos
    // We need to check for completed Runway videos to trigger UI updates
    const { data: pendingJobs, error } = await supabase
      .from("jobs")
      .select("id, did_video_url, promo_video_url, created_at, updated_at")
      .or("did_video_url.like.pending:%,promo_video_url.like.pending:%")
      .not("did_video_url", "eq", "pending:creating");

    if (error) {
      console.error("[pollPendingDIDVideos] Error fetching pending jobs:", error);
      return { success: false, error: error.message };
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log("[pollPendingDIDVideos] No pending videos found");
      return { success: true, message: "No pending videos found", processing: 0, updated: 0, errors: 0, timedOut: 0 };
    }

    console.log(`[pollPendingDIDVideos] Found ${pendingJobs.length} jobs with pending videos:`, 
      pendingJobs.map(j => ({ 
        id: j.id, 
        did_url: j.did_video_url, 
        promo_url: j.promo_video_url 
      })));
    
    // Process each pending job with exponential backoff retry logic
    const results = await Promise.all(
      pendingJobs.map(async (job) => {
        const jobId = job.id;
        const hasPendingDID = job.did_video_url?.startsWith("pending:");
        const hasPendingPromo = job.promo_video_url?.startsWith("pending:");
        
        // Check if job has exceeded timeout (default 10 minutes)
        const jobAge = Date.now() - new Date(job.created_at).getTime();
        const maxJobAge = timeout * 1000; // Convert to milliseconds
        
        if (jobAge > maxJobAge) {
          console.log(`Job ${jobId} has exceeded ${timeout}s timeout, setting failed states`);
          
          const updates: any = {};
          if (hasPendingDID) {
            updates.did_video_url = "failed:timeout";
          }
          if (hasPendingPromo) {
            updates.promo_video_url = "failed:timeout";
          }
          
          await supabase
            .from("jobs")
            .update(updates)
            .eq("id", jobId);
          
          await logStep(jobId, "VIDEO_TIMEOUT", {
            jobAge: Math.round(jobAge / 1000),
            maxAge: timeout,
            hasPendingDID,
            hasPendingPromo,
          });
          
          return {
            jobId,
            status: "failed",
            error: `Job exceeded ${timeout}s timeout`,
            hasPendingDID,
            hasPendingPromo,
          };
        }
        
        // Handle promo videos - only mark as stuck if job is old enough
        // Runway videos process synchronously but might take a few minutes
        if (hasPendingPromo && !hasPendingDID) {
          // Only mark as stuck if job is older than 5 minutes
          // (Runway processing should complete within this time)
          const fiveMinutes = 5 * 60 * 1000;
          if (jobAge > fiveMinutes) {
            console.log(`Job ${jobId} has stuck promo video (age: ${Math.round(jobAge/1000)}s), setting to failed state`);
            
            await supabase
              .from("jobs")
              .update({
                promo_video_url: "failed:stuck",
                promo_video_error: "Video generation took too long. Please try again with a different image."
              })
              .eq("id", jobId);
            
            await logStep(jobId, "PROMO_VIDEO_STUCK", {
              previousUrl: job.promo_video_url,
              reason: "Promo video stuck in pending state",
              jobAge: Math.round(jobAge / 1000),
            });
            
            return {
              jobId,
              status: "failed",
              type: "promo",
              error: "Promo video generation stuck",
            };
          } else {
            console.log(`Job ${jobId} has pending promo video but is still young (${Math.round(jobAge/1000)}s), skipping...`);
            return {
              jobId,
              status: "still_processing",
              type: "promo",
            };
          }
        }
        
        // Handle DID videos (only if they have pending DID)
        if (!hasPendingDID) {
          return {
            jobId,
            status: "no_pending_did",
          };
        }
        
        const talkId = job.did_video_url.replace("pending:", "");
        
        // Retry logic with exponential backoff for DID videos
        let lastError: any = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[pollPendingDIDVideos] Checking status for job ${jobId}, talk ID: ${talkId} (attempt ${attempt}/${maxRetries})`);
            
            // Get the talk status from D-ID with timeout
            const talkStatus = await Promise.race([
              didService.getTalkStatus(talkId),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('API request timeout')), 15000)
              )
            ]) as any;
            
            console.log(`[pollPendingDIDVideos] Talk status for job ${jobId}: ${talkStatus.status}`, {
              hasResultUrl: !!talkStatus.result_url,
              resultUrl: talkStatus.result_url ? 'Present' : 'Missing',
              error: talkStatus.error,
              attempt
            });
            
            await logStep(jobId, "DID_POLL_STATUS", {
              talkId,
              status: talkStatus.status,
              hasResultUrl: !!talkStatus.result_url,
              error: talkStatus.error,
              attempt
            });
            
            if (talkStatus.status === "done" && talkStatus.result_url) {
              console.log(`Video is ready for job ${jobId}! Updating with URL: ${talkStatus.result_url}`);
              
              // Update the job with the video URL, and also fix promo if needed
              const updates: any = {
                did_video_url: talkStatus.result_url,
              };
              
              if (hasPendingPromo) {
                updates.promo_video_url = "failed:stuck";
              }
              
              const { data: updatedJob, error: updateError } = await supabase
                .from("jobs")
                .update(updates)
                .eq("id", jobId)
                .select();
              
              if (updateError) {
                throw updateError;
              }
              
              await logStep(jobId, "DID_VIDEO_UPDATED", {
                videoUrl: talkStatus.result_url,
                previousUrl: job.did_video_url,
                attempt,
                alsoFixedPromo: hasPendingPromo,
              });
              
              return {
                jobId,
                talkId,
                status: "updated",
                videoUrl: talkStatus.result_url,
                attempts: attempt,
                type: "did",
                alsoFixedPromo: hasPendingPromo,
              };
            } else if (talkStatus.status === "error") {
              console.log(`Error generating video for job ${jobId}: ${talkStatus.error}`);
              
              // Update with failed state, and also fix promo if needed
              const updates: any = {
                did_video_url: "failed:generation_error",
              };
              
              if (hasPendingPromo) {
                updates.promo_video_url = "failed:stuck";
              }
              
              await supabase
                .from("jobs")
                .update(updates)
                .eq("id", jobId);
              
              await logStep(jobId, "DID_VIDEO_ERROR", {
                error: talkStatus.error,
                attempt,
                alsoFixedPromo: hasPendingPromo,
              });
              
              return {
                jobId,
                talkId,
                status: "failed",
                error: talkStatus.error,
                attempts: attempt,
                type: "did",
                alsoFixedPromo: hasPendingPromo,
              };
            } else {
              // Still processing - no retry needed for this case
              return {
                jobId,
                talkId,
                status: "processing",
                attempts: attempt,
                type: "did",
              };
            }
          } catch (error: any) {
            lastError = error;
            console.error(`Error checking talk status for job ${jobId} (attempt ${attempt}/${maxRetries}):`, error);
            
            // If this is not the last attempt, wait with exponential backoff
            if (attempt < maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Cap at 10s
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // All retries failed
        await logStep(jobId, "DID_POLL_ERROR", {
          error: lastError?.message,
          stack: lastError?.stack,
          maxRetries,
          finalAttempt: true,
          alsoFixedPromo: hasPendingPromo,
        });
        
        // Also fix promo video if it was stuck
        if (hasPendingPromo) {
          await supabase
            .from("jobs")
            .update({
              promo_video_url: "failed:stuck",
            })
            .eq("id", jobId);
        }
        
        return {
          jobId,
          talkId: hasPendingDID ? talkId : undefined,
          status: "failed",
          error: `Failed after ${maxRetries} attempts: ${lastError?.message}`,
          attempts: maxRetries,
          type: "did",
          alsoFixedPromo: hasPendingPromo,
        };
      })
    );
    
    return {
      success: true,
      results,
      updated: results.filter((r) => r.status === "updated").length,
      processing: results.filter((r) => r.status === "processing").length,
      errors: results.filter((r) => r.status === "failed").length,
      timedOut: results.filter((r) => r.status === "timeout").length,
    };
  } catch (error: any) {
    console.error("Error polling DID videos:", error);
    return { success: false, error: error.message };
  }
}
