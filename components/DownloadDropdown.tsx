'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Mail, MessageSquare, User, Video, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Job {
  id: string;
  business_name: string;
  openai_caption?: string;
  openai_email?: string;
  did_video_url?: string;
  promo_video_url?: string;
}

interface DownloadDropdownProps {
  job: Job;
}

export default function DownloadDropdown({ job }: DownloadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const downloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    window.URL.revokeObjectURL(url);
  };

  const downloadOptions = [
    {
      label: 'Social Caption',
      icon: MessageSquare,
      available: !!job.openai_caption,
      action: () => downloadText(job.openai_caption!, `${job.business_name}-social-caption.txt`)
    },
    {
      label: 'Email Copy',
      icon: Mail,
      available: !!job.openai_email,
      action: () => downloadText(job.openai_email!, `${job.business_name}-email.txt`)
    },
    {
      label: 'Avatar Video',
      icon: User,
      available: !!job.did_video_url && !job.did_video_url.includes('placeholder') && !job.did_video_url.startsWith('pending:'),
      action: () => downloadVideo(job.did_video_url!, `${job.business_name}-avatar-video.mp4`)
    },
    {
      label: 'Promo Video',
      icon: Video,
      available: !!job.promo_video_url && !job.promo_video_url.includes('placeholder') && !job.promo_video_url.startsWith('pending:'),
      action: () => downloadVideo(job.promo_video_url!, `${job.business_name}-promo-video.mp4`)
    }
  ];

  const availableOptions = downloadOptions.filter(option => option.available);

  if (availableOptions.length === 0) {
    return null;
  }

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position immediately when opening (before state update)
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Button
        ref={buttonRef}
        size="sm"
        variant="outline"
        onClick={handleToggle}
        className="gap-1.5 w-full"
      >
        <Download className="h-4 w-4" />
        Download
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Portal the dropdown to body to escape card overflow */}
      {isOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div 
            className="fixed z-50 bg-white rounded-md shadow-xl border border-gray-200 min-w-[200px]"
            style={{ 
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            {availableOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.label}
                  onClick={() => {
                    console.log('Downloading:', option.label);
                    option.action();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 bg-white"
                >
                  <div className="w-8 h-8 bg-[#ffde00] rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#240029]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
}