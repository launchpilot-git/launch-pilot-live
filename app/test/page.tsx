"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, TestTube, CheckCircle, XCircle, Video, MessageSquare, Camera } from "lucide-react"

export default function TestPage() {
  const [openaiTesting, setOpenaiTesting] = useState(false)
  const [openaiResults, setOpenaiResults] = useState<any>(null)
  const [openaiError, setOpenaiError] = useState<string | null>(null)

  const [didTesting, setDidTesting] = useState(false)
  const [didResults, setDidResults] = useState<any>(null)
  const [didError, setDidError] = useState<string | null>(null)

  const [runwayTesting, setRunwayTesting] = useState(false)
  const [runwayResults, setRunwayResults] = useState<any>(null)
  const [runwayError, setRunwayError] = useState<string | null>(null)

  const testOpenAI = async () => {
    setOpenaiTesting(true)
    setOpenaiError(null)
    setOpenaiResults(null)

    try {
      const response = await fetch("/api/test-openai-simple", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setOpenaiResults(data)
    } catch (err) {
      setOpenaiError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setOpenaiTesting(false)
    }
  }

  const testDID = async () => {
    setDidTesting(true)
    setDidError(null)
    setDidResults(null)

    try {
      const scriptElement = document.getElementById("didScript") as HTMLTextAreaElement
      const imageElement = document.getElementById("didImageUrl") as HTMLInputElement

      const script = scriptElement?.value || "Hi there! I'm excited to introduce you to this amazing product."
      const imageUrl = imageElement?.value || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"

      // Create a test job first
      const testJobResponse = await fetch("/api/create-test-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: "Test Business",
          brand_style: "professional",
          industry: "test",
          image_url: imageUrl,
          openai_avatar_script: script,
          test_mode: true,
        }),
      })

      if (!testJobResponse.ok) {
        throw new Error("Failed to create test job")
      }

      const testJob = await testJobResponse.json()

      // Now call the actual D-ID API
      const response = await fetch("/api/did", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: testJob.jobId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setDidResults(data)
    } catch (err) {
      setDidError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setDidTesting(false)
    }
  }

  const testRunway = async () => {
    setRunwayTesting(true)
    setRunwayError(null)
    setRunwayResults(null)

    try {
      const scriptElement = document.getElementById("runwayScript") as HTMLTextAreaElement
      const imageElement = document.getElementById("runwayImageUrl") as HTMLInputElement

      const script = scriptElement?.value || "A cinematic product showcase with smooth camera movements and dramatic lighting"
      const imageUrl = imageElement?.value || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"

      // Create a test job first
      const testJobResponse = await fetch("/api/create-test-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: "Test Business",
          brand_style: "cinematic",
          industry: "test",
          image_url: imageUrl,
          openai_cinematic_script: script,
          test_mode: true,
        }),
      })

      if (!testJobResponse.ok) {
        throw new Error("Failed to create test job")
      }

      const testJob = await testJobResponse.json()

      // Now call the actual Runway ML API
      const response = await fetch("/api/pika", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: testJob.jobId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setRunwayResults(data)
    } catch (err) {
      setRunwayError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setRunwayTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LaunchPilot API Testing</h1>
          <p className="text-gray-600">Test actual image processing and video generation with OpenAI, D-ID, and Runway ML</p>
        </div>

        <div className="grid gap-6">
          {/* OpenAI Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <span>OpenAI API Test</span>
              </CardTitle>
              <CardDescription>Test basic OpenAI connection and content generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testOpenAI} disabled={openaiTesting} className="w-full" size="lg">
                {openaiTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing OpenAI...
                  </>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" />
                    Test OpenAI Connection
                  </>
                )}
              </Button>

              {openaiResults && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">OpenAI Test Successful!</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Response:</strong> {openaiResults.message}</p>
                    <p><strong>Model:</strong> {openaiResults.model}</p>
                    <p><strong>Success:</strong> {openaiResults.success ? "✅ Yes" : "❌ No"}</p>
                  </div>
                </div>
              )}

              {openaiError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{openaiError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* D-ID Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span>D-ID Avatar Video Test</span>
              </CardTitle>
              <CardDescription>Test actual avatar video generation with D-ID API using real image processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="didScript">Avatar Script</Label>
                  <Textarea
                    id="didScript"
                    placeholder="Enter script for avatar..."
                    defaultValue="Hi there! I'm excited to introduce you to this amazing product."
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="didImageUrl">Image URL</Label>
                  <Input
                    id="didImageUrl"
                    placeholder="https://example.com/image.jpg"
                    defaultValue="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
                  />
                </div>
              </div>

              <Button onClick={testDID} disabled={didTesting} className="w-full" size="lg">
                {didTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Avatar Video (1-3 minutes)...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Test D-ID Avatar Generation
                  </>
                )}
              </Button>

              {didResults && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">D-ID Test Successful!</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Talk ID:</strong> {didResults.talkId}</p>
                    <p><strong>Status:</strong> {didResults.status}</p>
                    <p><strong>Success:</strong> {didResults.success ? "✅ Yes" : "❌ No"}</p>
                    {didResults.note && (
                      <p className="text-sm text-amber-600 mt-2"><strong>Note:</strong> {didResults.note}</p>
                    )}
                  </div>

                  {didResults.didData && (
                    <div className="text-xs text-gray-500 bg-white p-2 rounded">
                      <strong>Full Response:</strong>
                      <pre className="mt-1 overflow-x-auto">{JSON.stringify(didResults.didData, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {didError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{didError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Runway ML Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5 text-purple-600" />
                <span>Runway ML Video Test</span>
              </CardTitle>
              <CardDescription>Test actual cinematic video generation with Runway ML API using real image processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="runwayScript">Cinematic Prompt</Label>
                  <Textarea
                    id="runwayScript"
                    placeholder="Describe the video style..."
                    defaultValue="A cinematic product showcase with smooth camera movements and dramatic lighting"
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="runwayImageUrl">Product Image URL</Label>
                  <Input
                    id="runwayImageUrl"
                    placeholder="https://example.com/product.jpg"
                    defaultValue="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
                  />
                </div>
              </div>

              <Button onClick={testRunway} disabled={runwayTesting} className="w-full" size="lg">
                {runwayTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Cinematic Video (2-5 minutes)...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Test Runway ML Video Generation
                  </>
                )}
              </Button>

              {runwayResults && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Runway ML Test Successful!</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Success:</strong> {runwayResults.success ? "✅ Yes" : "❌ No"}</p>
                    {runwayResults.videoUrl && (
                      <p><strong>Video URL:</strong> <a href={runwayResults.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Video</a></p>
                    )}
                    {runwayResults.runwayData?.id && (
                      <p><strong>Task ID:</strong> {runwayResults.runwayData.id}</p>
                    )}
                  </div>

                  {runwayResults.videoUrl && (
                    <div className="bg-white p-4 rounded-lg">
                      <video controls className="w-full rounded-md shadow-sm" style={{ maxHeight: "400px" }}>
                        <source src={runwayResults.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {runwayResults.runwayData && (
                    <div className="text-xs text-gray-500 bg-white p-2 rounded">
                      <strong>Full Response:</strong>
                      <pre className="mt-1 overflow-x-auto">{JSON.stringify(runwayResults.runwayData, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {runwayError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{runwayError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}