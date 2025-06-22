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
        
        // Poll both D-ID videos and Runway status in parallel
        const [didResponse, runwayResponse] = await Promise.allSettled([
          fetch('/api/poll-did-videos', {
            headers: { 'Cache-Control': 'no-cache' },
          }),
          fetch('/api/check-runway-status', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache' 
            },
            body: JSON.stringify({ jobId }),
          })
        ]);
        
        // Handle D-ID response
        if (didResponse.status === 'fulfilled' && didResponse.value.ok) {
          const data = await didResponse.value.json();
          
          setStatus(data.success ? 'success' : 'error');
          setLastPollTime(new Date().toLocaleTimeString());
          setPollCount(prev => prev + 1);
          
          console.log(`[VideoStatusPoller] D-ID poll response:`, data);
          
          // Check if this specific job was updated or failed
          const jobWasUpdated = data.results?.some((result: any) => 
            result.jobId === jobId && (result.status === 'updated' || result.status === 'failed')
          );
          
          if (jobWasUpdated) {
            console.log(`[VideoStatusPoller] D-ID video for job ${jobId} was updated/failed, triggering refresh...`);
            if (onUpdate) {
              onUpdate();
            } else {
              router.refresh();
            }
            return; // Stop polling after update
          }
        }
        
        // Handle Runway response
        if (runwayResponse.status === 'fulfilled' && runwayResponse.value.ok) {
          const runwayData = await runwayResponse.value.json();
          
          console.log(`[VideoStatusPoller] Runway status for job ${jobId}:`, runwayData);
          
          // If Runway video completed, trigger refresh
          if (runwayData.success && runwayData.status === 'complete') {
            console.log(`[VideoStatusPoller] Runway video for job ${jobId} completed, triggering refresh...`);
            if (onUpdate) {
              onUpdate();
            } else {
              router.refresh();
            }
            return; // Stop polling after completion
          }
        }
        
        // Continue polling if we haven't hit the max
        if (currentPollCount < maxPolls) {
          console.log(`[VideoStatusPoller] Continuing to poll...`);
          timeoutId = setTimeout(pollForUpdates, pollInterval);
        } else {
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
