'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoStatusPollerProps {
  jobId: string;
  onUpdate?: () => void; // Callback for parent to refresh data
  onStatusChange?: (status: { pollCount: number; lastCheck: string; isPolling: boolean }) => void;
}

export default function VideoStatusPoller({ jobId, onUpdate, onStatusChange }: VideoStatusPollerProps) {
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  // Update status callback when state changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        pollCount,
        lastCheck: lastPollTime || 'Never',
        isPolling
      });
    }
  }, [pollCount, lastPollTime, isPolling, onStatusChange]);

  // Poll for video updates with exponential backoff
  useEffect(() => {
    // Only poll if we have a job ID
    if (!jobId) return;

    const basePollInterval = 5000; // Start with 5 seconds
    const maxPollInterval = 30000; // Max 30 seconds
    const maxPolls = 60; // Stop after ~10 minutes
    let timeoutId: NodeJS.Timeout;
    let currentPollCount = 0;
    let currentInterval = basePollInterval;

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
          // Exponential backoff: increase interval up to max
          currentInterval = Math.min(currentInterval * 1.5, maxPollInterval);
          console.log(`[VideoStatusPoller] Continuing to poll in ${currentInterval}ms...`);
          timeoutId = setTimeout(pollForUpdates, currentInterval);
        } else {
          console.log(`[VideoStatusPoller] Max polls reached, stopping...`);
          setStatus('timeout');
          if (onUpdate) {
            onUpdate(); // Final refresh even if we hit max polls
          }
        }
      } catch (error) {
        console.error('[VideoStatusPoller] Error polling for video updates:', error);
        setStatus('error');
        // Retry after error unless we've hit max polls
        if (currentPollCount < maxPolls) {
          // Use current interval for error retry (already has backoff)
          timeoutId = setTimeout(pollForUpdates, currentInterval);
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
