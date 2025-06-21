"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Plus, Sparkles, Lock, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { UpgradeLimitModal } from "@/components/upgrade-limit-modal"
import { useAuth } from "@/hooks/useAuth"
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

// Helper function to extract first name from user data
function getFirstName(user: any): string {
  // Try to get first name from full_name
  if (user?.user_metadata?.full_name) {
    const firstName = user.user_metadata.full_name.split(' ')[0]
    if (firstName && firstName.length > 0) {
      return firstName
    }
  }
  
  // Fallback to email prefix, cleaned up
  if (user?.email) {
    const emailPrefix = user.email.split('@')[0]
    // Remove numbers and special characters, capitalize first letter
    const cleanName = emailPrefix.replace(/[0-9_.-]/g, '').toLowerCase()
    if (cleanName.length > 0) {
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    }
  }
  
  // Final fallback
  return 'there'
}

// Image component with loading states
function JobImage({ src, alt, businessName }: { src: string | null, alt: string, businessName: string }) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  if (!src || imageError) {
    return (
      <div className="aspect-video w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
            <span className="text-gray-500 font-medium">
              {businessName.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-500">No image</p>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-video w-full relative bg-gray-100">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-200 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  )
}

export function DashboardFree() {
  const router = useRouter()
  const auth = useAuth()
  const { user, loading: authLoading, generationsUsed, canGenerate, error: authError, retryAuth } = auth
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // Simple fetch function without retry logic to prevent infinite loops
  const fetchJobs = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setFetchError(null)
      
      console.log(`[DashboardFree] Fetching jobs for user: ${user.id}`)
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[DashboardFree] Database error:", error.message)
        setFetchError(`Failed to load projects: ${error.message}`)
        return
      }
      
      console.log(`[DashboardFree] Successfully fetched ${data?.length || 0} jobs`)
      setJobs(data || [])
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error("[DashboardFree] Unexpected error:", errorMessage)
      setFetchError(`Error loading projects: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // FIXED: Simple useEffect that only runs when user.id changes
  useEffect(() => {
    if (user?.id) {
      fetchJobs()
    }
  }, [user?.id]) // ONLY depend on user.id
  
  // Add timeout detection for loading states
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading || loading) {
        console.warn('[DashboardFree] Loading timeout detected after 15 seconds')
        setLoadingTimeout(true)
      }
    }, 15000) // 15 second timeout
    
    return () => clearTimeout(timeoutId)
  }, [authLoading, loading])
  
  // Clear timeout when loading completes
  useEffect(() => {
    if (!authLoading && !loading) {
      setLoadingTimeout(false)
    }
  }, [authLoading, loading])

  const handleStartNewProject = () => {
    if (!canGenerate) {
      setShowUpgradeModal(true)
    } else {
      router.push('/generate/free')
    }
  }

  const handleRetryFetch = () => {
    console.log("[DashboardFree] Manual retry triggered")
    setLoadingTimeout(false)
    fetchJobs()
  }
  
  const handleRetryAuth = () => {
    console.log("[DashboardFree] Auth retry triggered")
    setLoadingTimeout(false)
    retryAuth()
  }

  // Show error state if auth failed or loading timed out
  if ((authError || loadingTimeout) && !authLoading && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {authError ? 'Authentication Error' : 'Loading Timeout'}
          </h2>
          <p className="text-gray-600 mb-6">
            {authError || 'The page is taking longer than expected to load. This might be due to a slow connection or server issue.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={authError ? handleRetryAuth : handleRetryFetch}
              className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c]"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading your projects...</p>
          {loadingTimeout && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">Taking longer than usual...</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const formatTimestamp = (date: string) => {
    const jobDate = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return jobDate.toLocaleDateString()
    }
  }

  // Get the user's first name using our helper function
  const firstName = getFirstName(user)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isPro={false} hasProjects={jobs.length > 0} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Hi {firstName}</h1>
            <p className="text-muted-foreground">Free Plan - {3 - generationsUsed} generations remaining this month</p>
          </div>

          {/* New Project Button */}
          <div className="mb-8">
            <Button 
              size="lg" 
              onClick={handleStartNewProject}
              className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200 gap-2"
            >
              <Plus className="h-5 w-5" />
              New Project
            </Button>
          </div>

          {fetchError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error loading projects</h3>
                      <p className="text-sm text-red-600 mt-1">{fetchError}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRetryFetch}
                    disabled={loading}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      'Retry'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {jobs.length === 0 && !fetchError ? (
            <Card className="text-center py-12 bg-white">
              <CardContent>
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Plus className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Start Your First Project</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Upload a product photo and watch as AI creates professional marketing content. 
                  Free plan includes 3 generations per month.
                </p>
                <Button 
                  size="lg" 
                  onClick={handleStartNewProject}
                  className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : jobs.length > 0 ? (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <JobImage 
                      src={job.image_url}
                      alt={job.business_name}
                      businessName={job.business_name}
                    />
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium">{job.business_name}</h3>
                        {job.status === "generating" || job.status === "pending" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                            Processing
                          </Badge>
                        ) : job.status === "complete" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                            Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatTimestamp(job.created_at)}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2 border-t p-4">
                      <Link href={`/results/${job.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <DownloadDropdown job={job} />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {/* "See what Pro unlocks" section */}
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-medium">See what Pro unlocks</h3>
              <Badge className="ml-1 bg-primary text-primary-foreground">PRO</Badge>
            </div>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-md bg-gray-100">
                <div className="aspect-video w-full bg-gray-200 blur-[2px] opacity-70">
                  <Image
                    src="/placeholder.svg?height=180&width=320"
                    alt="Avatar Video Preview"
                    width={320}
                    height={180}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-3">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-black/60 p-3 text-white">
                  <h4 className="font-medium">Avatar Videos</h4>
                  <p className="text-xs text-white/80">Create engaging avatar videos that explain your product</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-md bg-gray-100">
                <div className="aspect-video w-full bg-gray-200 blur-[2px] opacity-70">
                  <Image
                    src="/placeholder.svg?height=180&width=320"
                    alt="Promo Video Preview"
                    width={320}
                    height={180}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-3">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-black/60 p-3 text-white">
                  <h4 className="font-medium">Promo Videos</h4>
                  <p className="text-xs text-white/80">Generate professional product promo videos</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-md bg-gray-100">
                <div className="aspect-video w-full bg-gray-200 blur-[2px] opacity-70">
                  <Image
                    src="/placeholder.svg?height=180&width=320"
                    alt="Unlimited History Preview"
                    width={320}
                    height={180}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-3">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 w-full bg-black/60 p-3 text-white">
                  <h4 className="font-medium">Unlimited History</h4>
                  <p className="text-xs text-white/80">Access all your past projects and generations</p>
                </div>
              </div>
            </div>
            <Link href="/checkout">
              <Button className="gap-1.5 bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeLimitModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal} 
      />
    </div>
  )
}