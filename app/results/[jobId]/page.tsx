"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Copy, CheckCircle2, Lock, Sparkles, Download, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/hooks/useAuth"
import VideoStatusPoller from "@/components/VideoStatusPoller"
import CustomVideoPlayer from "@/components/CustomVideoPlayer"
import { AvatarScriptEditor } from "@/components/avatar-script-editor"

interface JobData {
  id: string
  business_name: string
  brand_style: string
  industry: string
  image_url: string
  status: string
  openai_caption?: string
  openai_email?: string
  openai_avatar_script?: string
  did_video_url?: string
  promo_video_url?: string
  promo_video_error?: string
  created_at: string
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, plan } = useAuth()
  const [jobData, setJobData] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [isAvatarVideoReady, setIsAvatarVideoReady] = useState(false)

  const jobId = params.jobId as string

  useEffect(() => {
    if (!jobId) return

    const fetchJobData = async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single()

        if (error) {
          throw new Error(error.message)
        }

        // Check if user owns this job
        if (data.user_id !== user?.id) {
          setError("You don't have permission to view this content")
          return
        }

        setJobData(data)
      } catch (err) {
        console.error("Error fetching job data:", err)
        setError(err instanceof Error ? err.message : "Failed to load content")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchJobData()
    }
  }, [jobId, user])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVideoUpdate = async () => {
    // Refresh job data when videos are updated
    console.log('[ResultsPage] Video updated, refreshing job data...')
    if (!jobId || !user) return

    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single()

      if (error) {
        console.error('Error refreshing job data:', error)
        return
      }

      if (data.user_id === user.id) {
        setJobData(data)
        // Reset video ready state when job data changes
        setIsAvatarVideoReady(false)
        console.log('[ResultsPage] Job data refreshed successfully')
      }
    } catch (err) {
      console.error('Error refreshing job data:', err)
    }
  }

  const downloadVideo = async (url: string, filename: string) => {
    try {
      // Use video proxy for D-ID videos that have CORS issues
      const shouldUseProxy = url.includes('d-id.com') || url.includes('amazonaws.com')
      const downloadUrl = shouldUseProxy 
        ? `/api/video-proxy?url=${encodeURIComponent(url)}`
        : url
      
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up the object URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback to opening in new tab
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar isPro={plan === 'pro'} />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your content...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar isPro={plan === 'pro'} />
        <main className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || "The requested content could not be found."}</p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const isPro = plan === 'pro'

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isPro={isPro} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <Badge 
                variant="secondary" 
                className={`capitalize ${
                  jobData.status === 'complete' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : ''
                }`}
              >
                {jobData.status}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Your Generated Content</h1>
            <p className="text-muted-foreground">
              Content generated for {jobData.business_name} • {jobData.brand_style} tone • {jobData.industry} industry
            </p>
          </div>

          {/* Product Image and Details */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <div className="aspect-square overflow-hidden rounded-md bg-gray-100">
                    <img
                      src={jobData.image_url}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                  <p className="text-lg font-medium">{jobData.business_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand Tone</label>
                  <p className="text-lg font-medium capitalize">{jobData.brand_style}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Industry</label>
                  <p className="text-lg font-medium capitalize">{jobData.industry}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Content Tabs */}
          <Tabs defaultValue="captions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="captions">Social Captions</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="avatar">
                Avatar Video {!isPro && <Lock className="ml-1 h-3 w-3" />}
              </TabsTrigger>
              <TabsTrigger value="promo">
                Promo Video {!isPro && <Lock className="ml-1 h-3 w-3" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="captions">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Social Media Captions</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1" 
                        onClick={() => handleCopy(jobData.openai_caption || "")}
                        disabled={!jobData.openai_caption}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    className="min-h-[200px]"
                    readOnly
                    value={jobData.openai_caption || "Content is being generated..."}
                    placeholder="Your social media captions will appear here..."
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Email Templates</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1" 
                        onClick={() => handleCopy(jobData.openai_email || "")}
                        disabled={!jobData.openai_email}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border p-4 min-h-[200px]">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-900">
                        {jobData.openai_email || "Email content is being generated..."}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avatar">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Avatar Video</h3>
                  </div>
                  <div className="max-w-2xl mx-auto space-y-4">
                    {/* Hidden video element to preload and check if video is ready */}
                    {isPro && jobData.did_video_url && !jobData.did_video_url.startsWith('pending:') && !jobData.did_video_url.startsWith('failed:') && jobData.did_video_url !== "script_ready" && !isAvatarVideoReady && (
                      <video
                        src={jobData.did_video_url.includes('d-id.com') || jobData.did_video_url.includes('amazonaws.com') 
                          ? `/api/video-proxy?url=${encodeURIComponent(jobData.did_video_url)}&jobId=${jobId}`
                          : jobData.did_video_url
                        }
                        onCanPlay={() => setIsAvatarVideoReady(true)}
                        style={{ display: 'none' }}
                        preload="auto"
                      />
                    )}
                    {isPro ? (
                      // Check if script is ready for editing
                      jobData.did_video_url === "script_ready" && jobData.openai_avatar_script ? (
                        <AvatarScriptEditor
                          initialScript={jobData.openai_avatar_script}
                          jobId={jobId}
                          onVideoGenerated={handleVideoUpdate}
                        />
                      ) : jobData.did_video_url && !jobData.did_video_url.startsWith('pending:') && !jobData.did_video_url.startsWith('failed:') && jobData.did_video_url !== "script_ready" && isAvatarVideoReady ? (
                        <div className="max-w-md mx-auto space-y-4">
                          <CustomVideoPlayer 
                            src={jobData.did_video_url}
                            aspectRatio="square"
                            className="shadow-lg"
                            jobId={jobId}
                            onReady={() => setIsAvatarVideoReady(true)}
                          />
                          <Button 
                            onClick={() => downloadVideo(jobData.did_video_url!, `${jobData.business_name}-avatar-video.mp4`)}
                            className="w-full bg-[#ffde00] text-[#240029] hover:bg-[#eab72c]"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Avatar Video
                          </Button>
                        </div>
                      ) : jobData.did_video_url && jobData.did_video_url.startsWith('failed:') ? (
                        <div className="aspect-square max-w-md mx-auto bg-red-50 rounded-lg border-2 border-red-200 flex items-center justify-center">
                          <div className="text-center p-6">
                            <div className="mb-4">
                              <X className="h-12 w-12 text-red-500 mx-auto" />
                            </div>
                            <h4 className="text-lg font-medium text-red-900 mb-2">Avatar Video Failed</h4>
                            <p className="text-sm text-red-700 mb-3">
                              We encountered an issue generating your avatar video. Please try again.
                            </p>
                            <Button 
                              onClick={() => window.location.reload()}
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square max-w-md mx-auto bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                          <div className="text-center p-6">
                            <div className="mb-4">
                              <div className="relative inline-flex">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-[#ffde00] absolute inset-0"></div>
                              </div>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Processing Avatar Video</h4>
                            <p className="text-sm text-gray-600 mb-1">This usually takes 1-3 minutes</p>
                            <p className="text-xs text-gray-500">Your AI presenter is being created...</p>
                            <VideoStatusPoller jobId={jobId} onUpdate={handleVideoUpdate} />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="aspect-square max-w-md mx-auto">
                        <button
                          onClick={() => setShowAvatarModal(true)}
                          className="relative h-full w-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-md hover:from-blue-100 hover:to-purple-100 transition-colors cursor-pointer"
                        >
                          {/* Lock icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="text-center">
                              <div className="mb-3 flex justify-center">
                                <Lock className="h-12 w-12 text-gray-500" />
                              </div>
                              <p className="text-base text-gray-600 font-medium">Click to learn more</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="promo">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Promo Video</h3>
                  </div>
                  <div className="space-y-4">
                    {isPro ? (
                      jobData.promo_video_url && !jobData.promo_video_url.startsWith('pending:') && !jobData.promo_video_url.startsWith('failed:') ? (
                        <div className="space-y-4">
                          <CustomVideoPlayer 
                            src={jobData.promo_video_url}
                            aspectRatio="video"
                            className="shadow-lg"
                          />
                          <Button 
                            onClick={() => downloadVideo(jobData.promo_video_url!, `${jobData.business_name}-promo-video.mp4`)}
                            className="w-full bg-[#ffde00] text-[#240029] hover:bg-[#eab72c]"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Promo Video
                          </Button>
                        </div>
                      ) : jobData.promo_video_url && jobData.promo_video_url.startsWith('failed:') ? (
                        <div className="aspect-video bg-red-50 rounded-lg border-2 border-red-200 flex items-center justify-center">
                          <div className="text-center p-6 max-w-md">
                            <div className="mb-4">
                              <X className="h-12 w-12 text-red-500 mx-auto" />
                            </div>
                            <h4 className="text-lg font-medium text-red-900 mb-2">Video Generation Failed</h4>
                            <p className="text-sm text-red-700 mb-3">
                              {jobData.promo_video_error || "We encountered an issue generating your promotional video. Please try again."}
                            </p>
                            <Button 
                              onClick={() => window.location.reload()}
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                          <div className="text-center p-6">
                            <div className="mb-4">
                              <div className="relative inline-flex">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200"></div>
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-[#ffde00] absolute inset-0"></div>
                              </div>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Processing Promo Video</h4>
                            <p className="text-sm text-gray-600 mb-1">This usually takes 2-5 minutes</p>
                            <p className="text-xs text-gray-500">Creating cinematic product showcase...</p>
                            <VideoStatusPoller jobId={jobId} onUpdate={handleVideoUpdate} />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="aspect-video">
                        <button
                          onClick={() => setShowPromoModal(true)}
                          className="relative h-full w-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-md hover:from-blue-100 hover:to-purple-100 transition-colors cursor-pointer"
                        >
                          {/* Lock icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="text-center">
                              <div className="mb-3 flex justify-center">
                                <Lock className="h-12 w-12 text-gray-500" />
                              </div>
                              <p className="text-base text-gray-600 font-medium">Click to learn more</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
            <Link href="/generate">
              <Button variant="outline">
                Create Another Project
              </Button>
            </Link>
            
            {!isPro && (
              <Link href="/checkout">
                <Button className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro for Videos
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Sticky footer upgrade CTA for free users */}
      {!isPro && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <p className="text-sm font-medium">Want to generate videos and save your history?</p>
            </div>
            <Link href="/checkout">
              <Button className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Avatar Video Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              Avatar Videos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Create engaging avatar videos that explain your product with AI-powered presenters. 
              Perfect for social media, websites, and marketing campaigns.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-sm mb-2">What you get with Avatar Videos:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Professional AI presenter</li>
                <li>• Custom script based on your product</li>
                <li>• High-quality video output</li>
                <li>• Multiple download formats</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAvatarModal(false)}
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Link href="/checkout" className="flex-1">
                <Button className="w-full bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c]">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promo Video Modal */}
      <Dialog open={showPromoModal} onOpenChange={setShowPromoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600" />
              Promo Videos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Generate professional product videos that convert viewers into customers. 
              Cinematic quality videos showcasing your product features.
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-sm mb-2">What you get with Promo Videos:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Cinematic product demonstrations</li>
                <li>• Professional camera movements</li>
                <li>• Custom visual storytelling</li>
                <li>• Ready for ads and social media</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPromoModal(false)}
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Link href="/checkout" className="flex-1">
                <Button className="w-full bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c]">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 