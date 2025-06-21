"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, ArrowLeft, Loader2, Camera, ArrowRight, Crown, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/hooks/useAuth"
import { GenerationProgress } from "@/components/generation-progress"


const brandStyles = ["casual", "witty", "elegant", "bold", "minimal", "professional", "playful", "luxury"]
const industries = [
  "tech", "fashion", "health", "food", "beauty", "home", "fitness",
  "education", "finance", "travel", "automotive", "jewelry", "books", "toys"
]

export function GeneratePro() {
  const router = useRouter()
  const { refreshUserData, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    businessName: "",
    brandStyle: "",
    industry: "",
    file: null as File | null,
    uploadedImageUrl: null as string | null,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData((prev) => ({ 
          ...prev, 
          file,
          uploadedImageUrl: e.target?.result as string 
        }))
        setActiveStep(2)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData((prev) => ({ 
          ...prev, 
          file,
          uploadedImageUrl: e.target?.result as string 
        }))
        setActiveStep(2)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerate = async () => {
    if (!formData.file || !formData.businessName || !formData.brandStyle || !formData.industry) {
      alert("Please fill in all fields and upload an image")
      return
    }

    setLoading(true)

    try {
      // Upload the image to Supabase Storage
      const fileExt = formData.file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, formData.file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath)

      // Create the job WITH user_id
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user?.id,
          business_name: formData.businessName,
          brand_style: formData.brandStyle,
          industry: formData.industry,
          image_url: publicUrl,
          status: "pending",
        })
        .select()
        .single()

      if (jobError) {
        throw new Error(`Job creation failed: ${jobError.message}`)
      }

      // Set job ID BEFORE showing progress modal
      console.log('✅ Job created with ID:', job.id)
      setJobId(job.id)
      setShowProgress(true)

      // Get the current session token for authentication with refresh
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error("Session expired. Please sign in again.")
      }
      
      if (!session?.access_token) {
        console.error('No access token found')
        throw new Error("Authentication required. Please sign in again.")
      }

      console.log('🔑 Using session token for API call')

      // Process the job with better error handling
      const processResponse = await fetch("/api/process-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ jobId: job.id }),
      })

      console.log('📡 API Response status:', processResponse.status)

      if (!processResponse.ok) {
        let errorData
        try {
          errorData = await processResponse.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          throw new Error(`API request failed with status ${processResponse.status}`)
        }

        console.error('API Error:', errorData)

        if (processResponse.status === 401) {
          throw new Error("Session expired. Please refresh the page and try again.")
        }
        throw new Error(errorData.error || `Failed to start processing (${processResponse.status})`)
      }

      const results = await processResponse.json()

      // Refresh user data to update generation count
      await refreshUserData()

      // Job ID already set above before progress modal
    } catch (error) {
      console.error("Error:", error)
      
      // Hide progress modal on any error
      setShowProgress(false)
      
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert("Failed to create project")
      }
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isPro={true} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
            <p className="text-muted-foreground">
              Upload a product image, add your brand name, tone, and industry, and watch your content be magically
              created.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${activeStep >= 1 ? "bg-accent text-accent-foreground" : "border bg-white text-muted-foreground"}`}
              >
                1
              </div>
              <div className="h-px flex-1 bg-gray-200"></div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${activeStep >= 2 ? "bg-accent text-accent-foreground" : "border bg-white text-muted-foreground"}`}
              >
                2
              </div>
              <div className="h-px flex-1 bg-gray-200"></div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${activeStep >= 3 ? "bg-accent text-accent-foreground" : "border bg-white text-muted-foreground"}`}
              >
                3
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Upload</span>
              <span>Generate</span>
              <span>Review</span>
            </div>
          </div>

          <div className="mb-8">
            {!formData.uploadedImageUrl ? (
              <Card
                className={`border-dashed ${isDragging ? "border-accent bg-accent/5" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-4 rounded-full bg-primary/10 p-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium">Upload Product Image</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Drag and drop your image here, or click to browse
                  </p>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={handleFileChange}
                    />
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Select Image</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="aspect-square overflow-hidden rounded-md bg-gray-100">
                        <img
                          src={formData.uploadedImageUrl || "/placeholder.svg"}
                          alt="Uploaded product"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Business Name</label>
                    <Input 
                      placeholder="Enter your business name"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Brand Tone</label>
                    <Select 
                      value={formData.brandStyle}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, brandStyle: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Industry</label>
                    <Select 
                      value={formData.industry}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry === 'tech' ? 'Technology' :
                             industry === 'health' ? 'Health & Wellness' :
                             industry === 'food' ? 'Food & Beverage' :
                             industry === 'beauty' ? 'Beauty & Cosmetics' :
                             industry === 'home' ? 'Home & Furniture' :
                             industry === 'fitness' ? 'Fitness & Sports' :
                             industry === 'fashion' ? 'Fashion & Apparel' :
                             industry === 'travel' ? 'Travel & Hospitality' :
                             industry.charAt(0).toUpperCase() + industry.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(
                    <Button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="mt-auto bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Content"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>


        </div>
      </main>
      
      {/* Progress Modal */}
      {showProgress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <GenerationProgress 
            isPro={true} 
            onComplete={() => {
              // Progress animation complete
            }}
            onViewContent={() => {
              console.log('🎯 View Content clicked, jobId:', jobId)
              if (jobId) {
                router.push(`/results/${jobId}`)
              } else {
                console.error('❌ No jobId available for navigation')
              }
            }}
          />
        </div>
      )}
    </div>
  )
}