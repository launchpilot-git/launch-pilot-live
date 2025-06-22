"use client"

import { useState } from "react"
import { DashboardFree } from "@/components/dashboard-free"
import { DashboardPro } from "@/components/dashboard-pro"
import { GenerateFree } from "@/components/generate-free"
import { GeneratePro } from "@/components/generate-pro"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { Eye, Download, Lock, Sparkles, X, ArrowLeft, Copy, CheckCircle2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import CustomVideoPlayer from "@/components/CustomVideoPlayer"
import Link from "next/link"

// Mock data for testing
const mockJob = {
  id: "test-job-1",
  business_name: "Test Business",
  brand_style: "elegant",
  industry: "fashion",
  image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
  status: "complete",
  openai_caption: "Discover timeless elegance with our premium watch collection. Crafted for those who appreciate the finer details in life. ⌚✨ #LuxuryWatches #TimelessStyle #ElegantDesign",
  openai_email: "Subject: Introducing Our Signature Timepiece Collection\n\nDear Valued Customer,\n\nWe're thrilled to unveil our latest collection of premium watches that blend sophisticated design with precision engineering. Each piece is meticulously crafted to complement your unique style while delivering uncompromising quality.\n\nExperience the perfect fusion of tradition and innovation. Our master watchmakers have created timepieces that not only tell time but tell your story.\n\nShop the collection today and enjoy complimentary shipping on all orders.",
  openai_avatar_script: "Welcome to our exclusive watch collection. Each timepiece is more than just an accessory – it's a statement of refined taste and exceptional craftsmanship. Discover the perfect watch that speaks to your personal style.",
  did_video_url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  promo_video_url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  created_at: new Date().toISOString()
}

const mockJobs = [
  mockJob,
  { ...mockJob, id: "test-job-2", business_name: "Fashion Forward", status: "generating" },
  { ...mockJob, id: "test-job-3", business_name: "Tech Innovations", status: "failed" }
]

// Mock auth context
const mockAuthContext = {
  user: { id: "test-user", email: "test@example.com", user_metadata: { full_name: "Test User" } },
  loading: false,
  plan: "free",
  generationsUsed: 2,
  canGenerate: true,
  signOut: () => {},
  error: null,
  retryAuth: () => {},
  refreshUserData: async () => {}
}

const mockAuthContextPro = {
  ...mockAuthContext,
  plan: "pro",
  generationsUsed: 0,
  canGenerate: true
}

export default function SandboxPage() {
  const [currentView, setCurrentView] = useState("dashboard-free")
  const [isPro, setIsPro] = useState(false)

  console.log('Current view:', currentView, 'isPro:', isPro)

  const renderResultsPage = () => (
    <div className="flex min-h-screen flex-col">
      <Navbar isPro={isPro} />
      <main className="flex-1 bg-gray-50">
        <div className={`container mx-auto px-4 py-8 md:px-6 ${!isPro ? 'pb-24' : ''}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                complete
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Your Generated Content</h1>
            <p className="text-muted-foreground">
              Content generated for {mockJob.business_name} • {mockJob.brand_style} tone • {mockJob.industry} industry
            </p>
          </div>

          {/* Product Image */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <div className="aspect-square overflow-hidden rounded-md bg-gray-100">
                    <img src={mockJob.image_url} alt="Product" className="h-full w-full object-cover" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                  <p className="text-lg font-medium">{mockJob.business_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand Tone</label>
                  <p className="text-lg font-medium capitalize">{mockJob.brand_style}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Industry</label>
                  <p className="text-lg font-medium capitalize">{mockJob.industry}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="captions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
              <TabsTrigger value="captions" className="text-xs sm:text-sm">Social Captions</TabsTrigger>
              <TabsTrigger value="emails" className="text-xs sm:text-sm">Emails</TabsTrigger>
              <TabsTrigger value="avatar" className="text-xs sm:text-sm">
                <span className="flex items-center justify-center">
                  <span className="truncate">Avatar Video</span>
                  {!isPro && <Lock className="ml-1 h-3 w-3 flex-shrink-0" />}
                </span>
              </TabsTrigger>
              <TabsTrigger value="promo" className="text-xs sm:text-sm">
                <span className="flex items-center justify-center">
                  <span className="truncate">Promo Video</span>
                  {!isPro && <Lock className="ml-1 h-3 w-3 flex-shrink-0" />}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="captions">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Social Media Captions</h3>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[200px]"
                    readOnly
                    value={mockJob.openai_caption}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emails">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Email Templates</h3>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-md border p-4 min-h-[200px]">
                    <pre className="whitespace-pre-wrap font-sans text-gray-900">
                      {mockJob.openai_email}
                    </pre>
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
                  <div className="max-w-full sm:max-w-md mx-auto space-y-4">
                    {isPro ? (
                      <>
                        <div className="aspect-square bg-black rounded-lg flex items-center justify-center">
                          <p className="text-white">Sample Avatar Video</p>
                        </div>
                        <Button className="w-full bg-[#ffde00] text-[#240029] hover:bg-[#eab72c]">
                          <Download className="h-4 w-4 mr-2" />
                          Download Avatar Video
                        </Button>
                      </>
                    ) : (
                      <div className="aspect-square max-w-full sm:max-w-md mx-auto">
                        <div className="relative h-full w-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-md hover:from-blue-100 hover:to-purple-100 transition-colors cursor-pointer">
                          <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="text-center">
                              <div className="mb-3 flex justify-center">
                                <Lock className="h-12 w-12 text-gray-500" />
                              </div>
                              <p className="text-base text-gray-600 font-medium">Click to learn more</p>
                            </div>
                          </div>
                        </div>
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
                      <>
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                          <p className="text-white">Sample Promo Video</p>
                        </div>
                        <Button className="w-full bg-[#ffde00] text-[#240029] hover:bg-[#eab72c]">
                          <Download className="h-4 w-4 mr-2" />
                          Download Promo Video
                        </Button>
                      </>
                    ) : (
                      <div className="aspect-video">
                        <div className="relative h-full w-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-md hover:from-blue-100 hover:to-purple-100 transition-colors cursor-pointer">
                          <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="text-center">
                              <div className="mb-3 flex justify-center">
                                <Lock className="h-12 w-12 text-gray-500" />
                              </div>
                              <p className="text-base text-gray-600 font-medium">Click to learn more</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
            <Button variant="outline" className="w-full sm:w-auto">
              Create Another Project
            </Button>
            {!isPro && (
              <Button className="gap-1.5 w-full sm:w-auto">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro for Videos
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Sticky footer for free users */}
      {!isPro && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 sm:p-4 z-50">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 text-center sm:text-left">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium">Want to generate videos and save your history?</p>
            </div>
            <Button size="sm" className="gap-1.5">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* View Selector */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-4">Sandbox - Mobile Responsiveness Testing</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant={currentView === "dashboard-free" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("dashboard-free"); setIsPro(false) }}
            >
              Dashboard Free
            </Button>
            <Button 
              variant={currentView === "dashboard-pro" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("dashboard-pro"); setIsPro(true) }}
            >
              Dashboard Pro
            </Button>
            <Button 
              variant={currentView === "results-free" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("results-free"); setIsPro(false) }}
            >
              Results Free
            </Button>
            <Button 
              variant={currentView === "results-pro" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("results-pro"); setIsPro(true) }}
            >
              Results Pro
            </Button>
            <Button 
              variant={currentView === "generate-free" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("generate-free"); setIsPro(false) }}
            >
              Generate Free
            </Button>
            <Button 
              variant={currentView === "generate-pro" ? "default" : "outline"}
              size="sm"
              onClick={() => { setCurrentView("generate-pro"); setIsPro(true) }}
            >
              Generate Pro
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Current viewport: {typeof window !== 'undefined' && window.innerWidth}px
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-4">
        {currentView === "dashboard-free" && (
          <div suppressHydrationWarning>
            {/* Mock the DashboardFree component inline to avoid auth issues */}
            <div className="flex min-h-screen flex-col">
              <div className="container mx-auto px-4 pt-4">
                <Navbar isPro={false} hasProjects={true} />
              </div>
              <main className="flex-1 bg-gray-50">
                <div className="container mx-auto px-4 py-8 md:px-6">
                  <div className="mb-8 flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Hi Test</h1>
                    <p className="text-muted-foreground">Free Plan - 1 generation remaining this month</p>
                  </div>
                  
                  <div className="mb-8">
                    <Button size="lg" className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c]">
                      New Project
                    </Button>
                  </div>

                  <div className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {mockJobs.map((job) => (
                        <Card key={job.id} className="overflow-hidden">
                          <div className="aspect-square overflow-hidden">
                            <img src={job.image_url} alt={job.business_name} className="h-full w-full object-cover" />
                          </div>
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="font-medium">{job.business_name}</h3>
                              <Badge variant="outline">{job.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Just now</p>
                          </CardContent>
                          <CardFooter className="flex justify-between gap-2 border-t p-4">
                            <Button variant="outline" size="sm" className="flex-1 gap-1">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        )}

        {currentView === "dashboard-pro" && (
          <div suppressHydrationWarning>
            <div className="flex min-h-screen flex-col">
              <div className="container mx-auto px-4 pt-4">
                <Navbar isPro={true} hasProjects={true} />
              </div>
              <main className="flex-1 bg-gray-50">
                <div className="container mx-auto px-4 py-8 md:px-6">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight">Hi Test</h1>
                      <p className="text-muted-foreground">Pro Plan - Unlimited generations</p>
                    </div>
                    <Link href="/generate">
                      <Button size="lg" className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c]">
                        New Project
                      </Button>
                    </Link>
                  </div>

                  <div className="mb-6">
                    <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {mockJobs.map((job) => (
                        <Card key={job.id} className="overflow-hidden">
                          <div className="aspect-square overflow-hidden">
                            <img src={job.image_url} alt={job.business_name} className="h-full w-full object-cover" />
                          </div>
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="font-medium truncate">{job.business_name}</h3>
                              <Badge variant="outline">{job.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Just now</p>
                          </CardContent>
                          <CardFooter className="grid grid-cols-2 gap-2 border-t p-4">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        )}

        {(currentView === "results-free" || currentView === "results-pro") && renderResultsPage()}

        {currentView === "generate-free" && (
          <div suppressHydrationWarning>
            <GenerateFree />
          </div>
        )}

        {currentView === "generate-pro" && (
          <div suppressHydrationWarning>
            <GeneratePro />
          </div>
        )}
      </div>
    </div>
  )
}