'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  aspectRatio?: 'video' | 'square';
  jobId?: string; // Optional job ID for D-ID URL refresh
}

export default function CustomVideoPlayer({ 
  src, 
  poster, 
  className = '', 
  aspectRatio = 'video',
  jobId
}: CustomVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
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

  // Extract thumbnail from video
  useEffect(() => {
    if (src && !poster) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true; // Ensure it can autoplay for thumbnail generation
      
      video.onloadeddata = () => {
        // Wait a bit for the frame to be ready
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (ctx && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0);
            setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
          }
        }, 100);
      };
      
      video.oncanplay = () => {
        video.currentTime = 0.5; // Get frame at 0.5 seconds for better thumbnail
      };
      
      video.src = videoSrc; // Use the proxied source for thumbnail generation too
    }
  }, [src, poster, videoSrc]);

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
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
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
        preload="auto"
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#ffde00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white text-sm">Loading video...</p>
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