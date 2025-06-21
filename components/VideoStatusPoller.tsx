'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoStatusPollerProps {
  jobId: string;
  onUpdate?: () => void; // Callback for parent to refresh data
}

export default function VideoStatusPoller({ jobId, onUpdate }: VideoStatusPollerProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  // Poll for video updates every 10 seconds
  useEffect(() => {
    // Only poll if we have a job ID
    if (!jobId) return;

    const pollInterval = 10000; // 10 seconds
    const maxPolls = 30; // Stop after 5 minutes (30 * 10 seconds)
    let timeoutId: NodeJS.Timeout;
    let currentPollCount = 0;

    async function pollForUpdates() {
      try {
        setIsPolling(true);
        currentPollCount++;
        
        console.log(`[VideoStatusPoller] Polling attempt ${currentPollCount} for job ${jobId}`);
        
        const response = await fetch('/api/poll-did-videos', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        setStatus(data.success ? 'success' : 'error');
        setLastPollTime(new Date().toLocaleTimeString());
        setPollCount(prev => prev + 1);
        
        console.log(`[VideoStatusPoller] Poll response:`, data);
        
        // Check if this specific job was updated or failed
        const jobWasUpdated = data.results?.some((result: any) => 
          result.jobId === jobId && (result.status === 'updated' || result.status === 'failed')
        );
        
        // Trigger parent refresh if this job was updated or failed
        if (jobWasUpdated) {
          console.log(`[VideoStatusPoller] Job ${jobId} was updated/failed, triggering refresh...`);
          if (onUpdate) {
            onUpdate();
          } else {
            // Fallback: use router refresh instead of full page reload
            router.refresh();
          }
          return; // Stop polling after update or failure
        }
        
        // Also stop polling if there are no more processing videos
        if (data.success && data.processing === 0) {
          console.log(`[VideoStatusPoller] No more videos processing, stopping...`);
          if (onUpdate) {
            onUpdate(); // Final refresh to get latest state
          }
          return;
        }
        
        // Continue polling if we have pending videos and haven't hit the max
        if (data.success && data.processing > 0 && currentPollCount < maxPolls) {
          console.log(`[VideoStatusPoller] Still processing ${data.processing} videos, continuing to poll...`);
          timeoutId = setTimeout(pollForUpdates, pollInterval);
        } else if (currentPollCount >= maxPolls) {
          console.log(`[VideoStatusPoller] Max polls reached, stopping...`);
          if (onUpdate) {
            onUpdate(); // Final refresh even if we hit max polls
          }
        }
      } catch (error) {
        console.error('[VideoStatusPoller] Error polling for video updates:', error);
        setStatus('error');
        // Retry after error unless we've hit max polls
        if (currentPollCount < maxPolls) {
          timeoutId = setTimeout(pollForUpdates, pollInterval * 2); // Wait longer after error
        }
      } finally {
        setIsPolling(false);
      }
    }

    // Start polling immediately
    pollForUpdates();

    // Clean up on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [jobId]);

  // This component doesn't render anything visible
  // It just handles the polling in the background
  return null;
}
