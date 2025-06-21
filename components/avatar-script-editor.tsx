"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, Edit2 } from "lucide-react"

interface AvatarScriptEditorProps {
  initialScript: string
  jobId: string
  onVideoGenerated: () => void
}

export function AvatarScriptEditor({ initialScript, jobId, onVideoGenerated }: AvatarScriptEditorProps) {
  const [script, setScript] = useState(initialScript)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateVideo = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Create a new API endpoint that accepts the edited script
      const response = await fetch('/api/did-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          script, // Send the edited script
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video')
      }

      const data = await response.json()
      console.log('Avatar video generation started:', data)
      
      // Notify parent component to refresh
      onVideoGenerated()
    } catch (err) {
      console.error('Error generating avatar video:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate video. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="border-2 border-accent/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="h-5 w-5 text-accent" />
          Avatar Script Editor
        </CardTitle>
        <CardDescription>
          Review and edit the AI-generated script before creating your avatar video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Avatar Script</label>
          <Textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Enter your avatar script..."
            className="min-h-[120px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {script.length}/500 characters
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerateVideo}
          disabled={isGenerating || !script.trim()}
          className="w-full bg-[#ffde00] text-[#240029] hover:bg-[#eab72c]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Avatar Video...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Avatar Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}