'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  aspectRatio?: 'video' | 'square';
  jobId?: string; // Optional job ID for D-ID URL refresh
  onReady?: () => void; // Callback when video is ready to play
  onUrlRefreshed?: () => void; // Callback when video URL is refreshed
}

export default function CustomVideoPlayer({ 
  src, 
  poster, 
  className = '', 
  aspectRatio = 'video',
  jobId,
  onReady,
  onUrlRefreshed
}: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [urlWasRefreshed, setUrlWasRefreshed] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper function to determine if we should use the video proxy
  const shouldUseProxy = (videoUrl: string) => {
    // Use proxy for D-ID videos (they have CORS issues)
    return videoUrl.includes('d-id.com') || videoUrl.includes('amazonaws.com');
  };

  // Get the appropriate video source (with proxy if needed)
  const getVideoSrc = (originalSrc: string) => {
    if (shouldUseProxy(originalSrc)) {
      const proxyUrl = `/api/video-proxy?url=${encodeURIComponent(originalSrc)}`;
      // Add jobId if available for D-ID URL refresh
      return jobId ? `${proxyUrl}&jobId=${jobId}` : proxyUrl;
    }
    return originalSrc;
  };

  const videoSrc = getVideoSrc(src);
  
  // Log video source for debugging
  useEffect(() => {
    console.log('[CustomVideoPlayer] Video source:', {
      originalSrc: src,
      proxiedSrc: videoSrc,
      shouldUseProxy: shouldUseProxy(src),
      jobId: jobId
    });
  }, [src, videoSrc, jobId]);

  // Add a timeout for video loading
  useEffect(() => {
    if (isLoading && !error) {
      const timeoutId = setTimeout(() => {
        if (isLoading && !canPlay) {
          console.error('[CustomVideoPlayer] Video loading timeout after 30 seconds');
          setError('Video loading timeout - please refresh the page');
          setIsLoading(false);
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, error, canPlay]);

  // Check if video URL was refreshed by monitoring fetch response
  useEffect(() => {
    if (shouldUseProxy(src) && jobId) {
      // Pre-flight check to see if URL might be expired
      fetch(videoSrc, { method: 'HEAD' })
        .then(response => {
          // Check if the video proxy refreshed the URL
          const wasRefreshed = response.headers.get('X-Video-Refreshed') === 'true';
          if (wasRefreshed && !urlWasRefreshed) {
            console.log('[CustomVideoPlayer] Video URL was refreshed by proxy');
            setUrlWasRefreshed(true);
            // Notify parent to refresh job data
            if (onUrlRefreshed) {
              onUrlRefreshed();
            }
          }
        })
        .catch(err => {
          console.log('[CustomVideoPlayer] Pre-flight check failed:', err);
        });
    }
  }, [src, videoSrc, jobId, urlWasRefreshed, onUrlRefreshed]);

  // Extract thumbnail from video with better error handling
  useEffect(() => {
    if (src && !poster && !thumbnail) {
      let thumbnailExtracted = false;
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      
      const extractThumbnail = () => {
        if (thumbnailExtracted || !video.videoWidth) return;
        
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setThumbnail(dataUrl);
            thumbnailExtracted = true;
            console.log('[CustomVideoPlayer] Thumbnail extracted successfully');
          }
        } catch (err) {
          console.error('[CustomVideoPlayer] Failed to extract thumbnail:', err);
        }
      };
      
      // Try multiple events to ensure we get a thumbnail
      video.onloadeddata = () => {
        console.log('[CustomVideoPlayer] Video loaded data, attempting thumbnail extraction');
        extractThumbnail();
      };
      
      video.onseeked = () => {
        console.log('[CustomVideoPlayer] Video seeked, attempting thumbnail extraction');
        extractThumbnail();
      };
      
      video.oncanplaythrough = () => {
        // Try to seek to get a better frame
        if (!thumbnailExtracted && video.duration > 0) {
          video.currentTime = Math.min(0.5, video.duration * 0.1);
        }
      };
      
      video.onerror = (e) => {
        console.error('[CustomVideoPlayer] Thumbnail video error:', e);
      };
      
      // Set source and load
      video.src = videoSrc;
      video.load();
      
      // Cleanup
      return () => {
        video.src = '';
        video.load();
      };
    }
  }, [src, poster, videoSrc, thumbnail]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setCanPlay(true);
    setIsBuffering(false);
    
    // Notify parent that video is ready
    if (onReady) {
      onReady();
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const error = video.error;
    
    console.error('[CustomVideoPlayer] Video error:', {
      code: error?.code,
      message: error?.message,
      src: videoSrc,
      networkState: video.networkState,
      readyState: video.readyState,
      retryCount: retryCount
    });
    
    // For network errors with D-ID videos, attempt one retry
    // This handles cases where the URL might be expired
    if (error?.code === 2 && shouldUseProxy(src) && retryCount < 1) {
      console.log('[CustomVideoPlayer] Network error detected, attempting retry...');
      setRetryCount(retryCount + 1);
      setError(null);
      setIsLoading(true);
      
      // Force reload the video element with a cache-busting parameter
      setTimeout(() => {
        if (videoRef.current) {
          const newSrc = videoSrc + (videoSrc.includes('?') ? '&' : '?') + '_retry=' + Date.now();
          videoRef.current.src = newSrc;
          videoRef.current.load();
        }
      }, 1000);
      return;
    }
    
    let errorMessage = 'Failed to load video';
    if (error) {
      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Video loading was aborted';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Network error while loading video';
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Video format not supported';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Video source not supported';
          break;
      }
    }
    
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && containerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group cursor-pointer ${
        aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'
      } ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster || thumbnail || undefined}
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={handleError}
        preload="auto"
      />

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center max-w-xs">
            <div className="mb-3">
              <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium mb-1">{error}</p>
            <p className="text-gray-300 text-xs">Please try refreshing the page</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#ffde00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white text-sm font-medium">
              {retryCount > 0 ? 'Refreshing video...' : 'Loading video...'}
            </p>
            {thumbnail && (
              <p className="text-white/70 text-xs mt-1">Preparing playback</p>
            )}
            {urlWasRefreshed && (
              <p className="text-white/70 text-xs mt-1">Getting latest version</p>
            )}
          </div>
        </div>
      )}

      {/* Buffering State */}
      {isBuffering && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-6 h-6 border-2 border-[#ffde00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play Button Overlay (always visible when paused and ready) */}
      {!isPlaying && canPlay && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200">
          <div className="w-16 h-16 bg-[#ffde00] rounded-full flex items-center justify-center shadow-lg hover:bg-[#eab72c] transition-colors duration-200">
            <Play className="w-8 h-8 text-[#240029] ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Ready indicator when video is loaded but not played yet */}
      {!isPlaying && canPlay && !isLoading && thumbnail && (
        <div className="absolute top-4 right-4">
          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            Ready
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-200 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div 
          className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-[#ffde00] rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-8 h-8 bg-[#ffde00] rounded-full flex items-center justify-center hover:bg-[#eab72c] transition-colors duration-200"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-[#240029]" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 text-[#240029] ml-0.5" fill="currentColor" />
              )}
            </button>
            
            <span className="text-white text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                }
              }}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
            >
              <Volume2 className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen();
                  }
                }
              }}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}