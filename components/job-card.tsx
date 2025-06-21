"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Play,
  Mail,
  MessageSquare,
  Video,
  AlertTriangle,
  RefreshCw,
  Lock,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import VideoStatusPoller from "./VideoStatusPoller"
import DownloadDropdown from "./DownloadDropdown"

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

interface JobCardProps {
  job: Job
  userPlan?: 'free' | 'pro'
}

export function JobCard({ job, userPlan = 'free' }: JobCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const isFreePlan = userPlan === 'free'

  const LockedContent = ({ children, feature }: { children: React.ReactNode; feature: string }) => (
    <div className="relative">
      <div className="blur-sm opacity-50">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 flex flex-col items-center justify-center">
        <div className="bg-white rounded-full p-3 shadow-lg mb-2">
          <Lock className="h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">{feature} - Pro Only</p>
        <Link href="/checkout">
          <Button size="sm" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  )

  // Simulate progress for generating status
  useEffect(() => {
    if (job.status === "generating") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90 // Cap at 90% until actually complete
          return prev + Math.random() * 10
        })
      }, 1000)
      return () => clearInterval(interval)
    } else if (job.status === "complete") {
      setProgress(100)
    }
  }, [job.status])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "generating":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-[#f4c537]/20 text-[#c29d2a] border border-[#f4c537]/30"
      case "generating":
        return "bg-blue-500/20 text-blue-700 border border-blue-500/30"
      case "complete":
        return "bg-green-500/20 text-green-700 border border-green-500/30"
      case "failed":
        return "bg-red-500/20 text-red-700 border border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-700 border border-gray-500/30"
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
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

  const getVideoStatus = (videoUrl?: string) => {
    if (!videoUrl) return { status: "not_started", label: "Not Started", icon: Clock }
    if (videoUrl.startsWith("pending:")) return { status: "processing", label: "Processing", icon: Loader2 }
    if (videoUrl.includes("placeholder")) return { status: "failed", label: "Failed", icon: AlertTriangle }
    return { status: "ready", label: "Ready", icon: CheckCircle }
  }

  const retryJob = async () => {
    try {
      const response = await fetch("/api/process-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      })

      if (!response.ok) {
        throw new Error("Failed to retry job")
      }

      // The dashboard will automatically update via real-time subscription
    } catch (error) {
      console.error("Error retrying job:", error)
    }
  }

  return (
    <Card className="w-full bg-white/80 backdrop-blur-xl border-white/15 shadow-[0px_10px_40px_rgba(0,0,0,0.08)]">
      {/* Add VideoStatusPoller to automatically check for video updates */}
      {(job.status === "generating" || 
        (job.status === "complete" && (
          job.did_video_url?.startsWith("pending:") || 
          job.promo_video_url?.startsWith("pending:")
        ))) && (
        <VideoStatusPoller jobId={job.id} />
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl">{job.business_name}</CardTitle>
              <Badge className={getStatusColor(job.status)}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(job.status)}
                  <span className="capitalize">{job.status}</span>
                </div>
              </Badge>
            </div>
            <CardDescription>
              {job.brand_style} • {job.industry} • Created {formatDate(job.created_at)}
            </CardDescription>

            {job.status === "generating" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generating content...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
          <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-100 ml-4">
            <Image src={job.image_url || "/placeholder.svg"} alt="Product" fill className="object-cover" sizes="80px" />
          </div>
        </div>
      </CardHeader>

      {job.status === "complete" && (
        <CardContent>
          <Tabs defaultValue="caption" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="caption" className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Caption</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>
              <TabsTrigger value="avatar" className="flex items-center space-x-1">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Avatar</span>
              </TabsTrigger>
              <TabsTrigger value="promo" className="flex items-center space-x-1">
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Promo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="caption" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Social Media Caption</h3>
                <div className="relative">
                  <Textarea value={job.openai_caption || ""} readOnly className="min-h-[100px] pr-12" />
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

            <TabsContent value="email" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Marketing Email</h3>
                <div className="relative">
                  <Textarea value={job.openai_email || ""} readOnly className="min-h-[200px] pr-12" />
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

            <TabsContent value="avatar" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Avatar Video</h3>
                {isFreePlan ? (
                  <LockedContent feature="Avatar Videos">
                    <div className="space-y-3">
                      <div className="relative">
                        <Textarea
                          value="This is a sample avatar script that would explain your product features in an engaging way..."
                          readOnly
                          className="min-h-[100px] pr-12"
                          placeholder="Avatar script"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium">Ready</span>
                          </div>
                          <Button size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Watch
                          </Button>
                        </div>
                      </div>
                    </div>
                  </LockedContent>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={job.openai_avatar_script || ""}
                        readOnly
                        className="min-h-[100px] pr-12"
                        placeholder="Avatar script"
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
                              <span className="text-sm font-medium">{videoStatus.label}</span>
                            </div>

                            {videoStatus.status === "ready" && (
                              <Button size="sm" asChild>
                                <a 
                                  href={`/api/video-player?url=${encodeURIComponent(job.did_video_url || '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Watch
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="promo" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Promotional Video</h3>
                {isFreePlan ? (
                  <LockedContent feature="Promo Videos">
                    <div className="space-y-3">
                      <div className="relative">
                        <Textarea
                          value="This is a sample cinematic script for a professional product promo video..."
                          readOnly
                          className="min-h-[100px] pr-12"
                          placeholder="Cinematic script"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium">Ready</span>
                          </div>
                          <Button size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Watch
                          </Button>
                        </div>
                      </div>
                    </div>
                  </LockedContent>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={job.openai_cinematic_script || ""}
                        readOnly
                        className="min-h-[100px] pr-12"
                        placeholder="Cinematic script"
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
                              <span className="text-sm font-medium">{videoStatus.label}</span>
                            </div>

                            {videoStatus.status === "ready" && (
                              <Button size="sm" asChild>
                                <a href={job.promo_video_url} target="_blank" rel="noopener noreferrer">
                                  <Play className="h-4 w-4 mr-2" />
                                  Watch
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      {job.status === "generating" && (
        <CardContent>
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Generating your marketing content...</p>
            <p className="text-sm text-gray-500 mt-2">This usually takes 2-5 minutes</p>
          </div>
        </CardContent>
      )}

      {job.status === "failed" && (
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600">Failed to generate content</p>
            <p className="text-sm text-gray-500 mt-2">There was an issue processing your request. Please try again.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={retryJob}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
