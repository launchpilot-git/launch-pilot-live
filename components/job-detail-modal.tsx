"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Copy,
  CheckCircle,
  MessageSquare,
  Mail,
  Video,
  Play,
  Download,
  RefreshCw,
  Loader2,
  Clock,
  AlertTriangle,
} from "lucide-react"
import Image from "next/image"
import VideoStatusPoller from "./VideoStatusPoller"

interface Job {
  id: string
  status: "pending" | "generating" | "complete" | "failed"
  business_name: string
  brand_style: string
  industry: string
  image_url: string
  openai_caption?: string
  openai_email?: string
  openai_avatar_script?: string
  openai_cinematic_script?: string
  did_video_url?: string
  promo_video_url?: string
  created_at: string
}

interface JobDetailModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  onDownload: (job: Job) => void
}

export function JobDetailModal({
  job,
  isOpen,
  onClose,
  onDownload,
}: JobDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!job) return null

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const getVideoStatus = (videoUrl?: string) => {
    if (!videoUrl) return { status: "not_started", label: "Not Started", icon: Clock }
    if (videoUrl.startsWith("pending:")) return { status: "processing", label: "Processing", icon: Loader2 }
    if (videoUrl.includes("placeholder")) return { status: "failed", label: "Failed", icon: AlertTriangle }
    return { status: "ready", label: "Ready", icon: CheckCircle }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Add VideoStatusPoller to automatically check for video updates */}
        {(job.status === "generating" || 
          (job.status === "complete" && (
            job.did_video_url?.startsWith("pending:") || 
            job.promo_video_url?.startsWith("pending:")
          ))) && (
          <VideoStatusPoller jobId={job.id} />
        )}
        
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-100">
                <Image 
                  src={job.image_url || "/placeholder.svg"} 
                  alt={job.business_name} 
                  fill 
                  className="object-cover" 
                  sizes="64px" 
                />
              </div>
              <div>
                <DialogTitle className="text-xl">{job.business_name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {job.brand_style} • {job.industry} • Created {formatDate(job.created_at)}
                </p>
              </div>
            </div>
            <Badge className={
              job.status === "complete" ? "bg-green-50 text-green-700" :
              job.status === "generating" ? "bg-amber-50 text-amber-700" :
              job.status === "failed" ? "bg-red-50 text-red-700" :
              "bg-gray-50 text-gray-700"
            }>
              {job.status === "generating" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {job.status === "complete" && <CheckCircle className="h-3 w-3 mr-1" />}
              <span className="capitalize">{job.status}</span>
            </Badge>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <div className="flex gap-2 mb-6">
            <Button 
              size="sm"
              onClick={() => onDownload(job)}
              disabled={job.status !== 'complete'}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          {job.status === "complete" ? (
            <Tabs defaultValue="caption" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="caption" className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>Caption</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </TabsTrigger>
                <TabsTrigger value="avatar" className="flex items-center space-x-1">
                  <Video className="h-4 w-4" />
                  <span>Avatar</span>
                </TabsTrigger>
                <TabsTrigger value="promo" className="flex items-center space-x-1">
                  <Play className="h-4 w-4" />
                  <span>Promo</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="caption" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Social Media Caption</h3>
                  <div className="relative">
                    <Textarea 
                      value={job.openai_caption || ""} 
                      readOnly 
                      className="min-h-[150px] pr-12" 
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(job.openai_caption || "", "caption")}
                    >
                      {copiedField === "caption" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Marketing Email</h3>
                  <div className="relative">
                    <Textarea 
                      value={job.openai_email || ""} 
                      readOnly 
                      className="min-h-[300px] pr-12" 
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(job.openai_email || "", "email")}
                    >
                      {copiedField === "email" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="avatar" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Avatar Video Script</h3>
                  <div className="relative">
                    <Textarea
                      value={job.openai_avatar_script || ""}
                      readOnly
                      className="min-h-[150px] pr-12 mb-4"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(job.openai_avatar_script || "", "avatar-script")}
                    >
                      {copiedField === "avatar-script" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {(() => {
                    const videoStatus = getVideoStatus(job.did_video_url)
                    const Icon = videoStatus.icon

                    return (
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon
                              className={`h-5 w-5 ${
                                videoStatus.status === "processing"
                                  ? "animate-spin text-blue-500"
                                  : videoStatus.status === "ready"
                                    ? "text-green-500"
                                    : videoStatus.status === "failed"
                                      ? "text-red-500"
                                      : "text-gray-500"
                              }`}
                            />
                            <span className="text-sm font-medium">Video {videoStatus.label}</span>
                          </div>

                          {videoStatus.status === "ready" && (
                            <Button size="sm" asChild>
                              <a 
                                href={`/api/video-player?url=${encodeURIComponent(job.did_video_url || '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Watch Video
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="promo" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Cinematic Script</h3>
                  <div className="relative">
                    <Textarea
                      value={job.openai_cinematic_script || ""}
                      readOnly
                      className="min-h-[150px] pr-12 mb-4"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(job.openai_cinematic_script || "", "cinematic-script")}
                    >
                      {copiedField === "cinematic-script" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {(() => {
                    const videoStatus = getVideoStatus(job.promo_video_url)
                    const Icon = videoStatus.icon

                    return (
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon
                              className={`h-5 w-5 ${
                                videoStatus.status === "processing"
                                  ? "animate-spin text-blue-500"
                                  : videoStatus.status === "ready"
                                    ? "text-green-500"
                                    : videoStatus.status === "failed"
                                      ? "text-red-500"
                                      : "text-gray-500"
                              }`}
                            />
                            <span className="text-sm font-medium">Video {videoStatus.label}</span>
                          </div>

                          {videoStatus.status === "ready" && (
                            <Button size="sm" asChild>
                              <a href={job.promo_video_url} target="_blank" rel="noopener noreferrer">
                                <Play className="h-4 w-4 mr-2" />
                                Watch Video
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          ) : job.status === "generating" ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Generating your marketing content...</p>
              <p className="text-sm text-gray-500 mt-2">This usually takes 2-5 minutes</p>
            </div>
          ) : job.status === "failed" ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
              <p className="text-gray-600">Failed to generate content</p>
              <p className="text-sm text-gray-500 mt-2">Please try regenerating the content.</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}