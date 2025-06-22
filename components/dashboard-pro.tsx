"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Download, Plus, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
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

// Enhanced Image Component with loading states and error handling
function JobImage({ src, alt, businessName }: { src: string | null, alt: string, businessName: string }) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 2

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    if (retryCount < maxRetries) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1)
        setImageLoading(true)
        setImageError(false)
      }, 1000)
    } else {
      setImageError(true)
    }
  }

  const imageSrc = src || "/placeholder.svg"

  return (
    <div className="aspect-square w-full overflow-hidden bg-gray-100 relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      
      {imageError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
            <span className="text-lg font-bold text-gray-400">
              {businessName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-center px-2">Image unavailable</span>
        </div>
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={400}
          height={400}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          priority={false}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        />
      )}
    </div>
  )
}

export function DashboardPro() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const maxRetries = 3

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signup')
    } else if (user) {
      fetchJobs()
    }
  }, [user, authLoading, router])

  const fetchJobs = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setFetchError(null)
      setIsRetrying(retryCount > 0)
      
      console.log(`[DashboardPro] Fetching jobs for user: ${user.id} (attempt ${retryCount + 1})`)
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        const errorDetails = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: user.id,
          timestamp: new Date().toISOString()
        }
        
        console.error("[DashboardPro] Supabase error fetching jobs:", errorDetails)
        throw new Error(`Database error: ${error.message}${error.details ? ` (${error.details})` : ''}`)
      }
      
      console.log(`[DashboardPro] Successfully fetched ${data?.length || 0} jobs`)
      setJobs(data || [])
      setRetryCount(0) // Reset retry count on success
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const errorDetails = {
        message: errorMessage,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        retryCount,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      }
      
      console.error("[DashboardPro] Error fetching jobs:", errorDetails)
      setFetchError(errorMessage)
      
      // Auto-retry for retryable errors
      const isRetryable = !errorMessage.includes('permission') && 
                         !errorMessage.includes('unauthorized') && 
                         !errorMessage.includes('forbidden') &&
                         !errorMessage.includes('authentication')
      
      if (retryCount < maxRetries && isRetryable) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff, max 5s
        console.log(`[DashboardPro] Auto-retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchJobs()
        }, retryDelay)
      }
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }

  const handleView = (job: Job) => {
    router.push(`/results/${job.id}`)
  }

  const handleDownload = async (job: Job) => {
    const content = `
BUSINESS: ${job.business_name}
BRAND STYLE: ${job.brand_style}
INDUSTRY: ${job.industry}

SOCIAL MEDIA CAPTION
-------------------
${job.openai_caption || 'Not available'}

EMAIL MARKETING COPY
-------------------
${job.openai_email || 'Not available'}

AVATAR VIDEO SCRIPT
-------------------
${job.openai_avatar_script || 'Not available'}

CINEMATIC PROMO SCRIPT
----------------------
${job.openai_cinematic_script || 'Not available'}

VIDEO LINKS
-----------
Avatar Video: ${job.did_video_url || 'Not available'}
Promo Video: ${job.promo_video_url || 'Not available'}
`.trim()

    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${job.business_name.replace(/\s+/g, '-').toLowerCase()}-marketing-content.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }


  const handleRetryFetch = () => {
    console.log("[DashboardPro] Manual retry triggered")
    setRetryCount(0) // Reset retry count for manual retry
    fetchJobs()
  }

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 172800) return "Yesterday"
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
      case "generating":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            Processing
          </Badge>
        )
      case "complete":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Complete
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
            Pending
          </Badge>
        )
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-2" />
          {isRetrying && (
            <p className="text-sm text-gray-500">Retrying... (attempt {retryCount + 1})</p>
          )}
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isPro={true} hasProjects={jobs.length > 0} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Hi {user.user_metadata?.full_name || 'there'}</h1>
            <p className="text-muted-foreground">Pro Plan - Unlimited generations</p>
          </div>

          {/* New Project Button */}
          <div className="mb-8">
            <Link href="/generate/pro">
              <Button 
                size="lg" 
                className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200 gap-2"
              >
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            </Link>
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
                      {retryCount > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Failed after {retryCount} attempt{retryCount > 1 ? 's' : ''}
                        </p>
                      )}
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

          <div className="mb-6">
            <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
            {jobs.length === 0 && !fetchError ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No projects yet</p>
                <p className="text-muted-foreground mb-4">Start your first project to see it here</p>
                <Link href="/generate">
                  <Button className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200">
                    Create Your First Project
                  </Button>
                </Link>
              </Card>
            ) : jobs.length > 0 ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <JobImage 
                      src={job.image_url}
                      alt={job.business_name}
                      businessName={job.business_name}
                    />
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-medium truncate">{job.business_name}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatTimestamp(job.created_at)}</p>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2 border-t p-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleView(job)}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <DownloadDropdown job={job} />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </main>

    </div>
  )
}