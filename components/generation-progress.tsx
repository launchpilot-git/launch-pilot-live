"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Brain, Wand2, Video, CheckCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GenerationProgressProps {
  isPro: boolean
  onComplete?: () => void
  onViewContent?: () => void
  onError?: () => void
  errorMessage?: string
}

const FREE_STAGES = [
  { 
    id: 1, 
    icon: Upload, 
    title: "Processing Image", 
    description: "Analyzing your product image...",
    duration: 2000,
    progress: [0, 25]
  },
  { 
    id: 2, 
    icon: Brain, 
    title: "Generating Content", 
    description: "Creating social media captions and emails...",
    duration: 3000,
    progress: [25, 80]
  },
  { 
    id: 3, 
    icon: CheckCircle, 
    title: "Finalizing", 
    description: "Saving your content...",
    duration: 1000,
    progress: [80, 100]
  }
]

const PRO_STAGES = [
  { 
    id: 1, 
    icon: Upload, 
    title: "Processing Image", 
    description: "Analyzing your product image...",
    duration: 2000,
    progress: [0, 15]
  },
  { 
    id: 2, 
    icon: Brain, 
    title: "Generating Content", 
    description: "Creating captions, emails, and video scripts...",
    duration: 3000,
    progress: [15, 40]
  },
  { 
    id: 3, 
    icon: Video, 
    title: "Creating Avatar Video", 
    description: "Generating talking spokesperson video...",
    duration: 4000,
    progress: [40, 70]
  },
  { 
    id: 4, 
    icon: Wand2, 
    title: "Creating Cinematic Video", 
    description: "Producing promotional video...",
    duration: 3000,
    progress: [70, 95]
  },
  { 
    id: 5, 
    icon: CheckCircle, 
    title: "Finalizing", 
    description: "Completing your content package...",
    duration: 1000,
    progress: [95, 100]
  }
]

export function GenerationProgress({ isPro, onComplete, onViewContent, onError, errorMessage }: GenerationProgressProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [hasError, setHasError] = useState(false)

  const stages = isPro ? PRO_STAGES : FREE_STAGES

  useEffect(() => {
    if (currentStage >= stages.length) {
      setProgress(100)
      setIsComplete(true)
      onComplete?.()
      return
    }

    const stage = stages[currentStage]
    const [startProgress, endProgress] = stage.progress
    const progressDiff = endProgress - startProgress
    const stepSize = progressDiff / (stage.duration / 100) // Update every 100ms
    
    // Start from the end of previous stage to prevent backwards movement
    let currentProgress = currentStage === 0 ? 0 : stages[currentStage - 1].progress[1]
    
    const interval = setInterval(() => {
      currentProgress += stepSize
      
      if (currentProgress >= endProgress) {
        setProgress(endProgress)
        clearInterval(interval)
        
        // Move to next stage after a brief pause
        setTimeout(() => {
          setCurrentStage(prev => prev + 1)
        }, 300)
      } else {
        // Ensure progress only moves forward
        setProgress(prev => Math.max(prev, Math.min(currentProgress, endProgress)))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [currentStage, stages, onComplete])

  const currentStageData = stages[currentStage] || stages[stages.length - 1]
  const CurrentIcon = currentStageData.icon

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#f4c537] rounded-full flex items-center justify-center mx-auto mb-4">
            <CurrentIcon className="w-8 h-8 text-[#2c0e31]" />
          </div>
          <h3 className="text-lg font-semibold text-[#2c0e31] mb-2">
            {isComplete ? "Complete!" : currentStageData.title}
          </h3>
          <p className="text-sm text-gray-600">
            {isComplete ? "Your content is ready!" : currentStageData.description}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-[#2c0e31]">{Math.round(progress)}%</span>
          </div>
          
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-[#f4c537] to-[#eab72c] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Stage</div>
              <div className="text-sm font-medium text-[#2c0e31]">
                {Math.min(currentStage + 1, stages.length)} / {stages.length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Est. Time</div>
              <div className="text-sm font-medium text-[#2c0e31]">
                {isPro ? "2-3 min" : "30-60 sec"}
              </div>
            </div>
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center space-x-2 mt-6 mb-4">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index < currentStage 
                  ? 'bg-green-500' 
                  : index === currentStage 
                    ? 'bg-[#f4c537]' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* View Content Button */}
        {isComplete && onViewContent && (
          <div className="text-center mt-4">
            <Button 
              onClick={onViewContent}
              className="bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
              size="lg"
            >
              <Eye className="mr-2 h-5 w-5" />
              View Your Content
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}