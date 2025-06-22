"use client"

import { useState } from "react"

const BRAND_STYLES = [
  "bold", "witty", "casual", "elegant", 
  "uplifting", "fun", "empowering", "minimalist"
]

export default function RunwaySandboxPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string>("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [generatingVideo, setGeneratingVideo] = useState<string | null>(null)
  const [videoResults, setVideoResults] = useState<Record<string, any>>({})
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name, file.type, file.size)
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        console.log('File loaded, result length:', result?.length)
        console.log('Setting selectedImage state:', result ? 'SUCCESS' : 'FAILED')
        setSelectedImage(result)
        setErrorMessage('') // Clear any previous errors
        console.log('selectedImage state should now be set')
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        setErrorMessage('Error reading file. Please try again.')
      }
      reader.readAsDataURL(file)
      setResults(null)
    } else {
      console.log('No file selected')
    }
  }

  const generatePrompts = async () => {
    if (!selectedImage) {
      setErrorMessage("Please upload an image first")
      return
    }

    setIsGenerating(true)
    setErrorMessage("")
    setStatusMessage("Generating prompts...")
    
    try {
      const response = await fetch("/api/test-runway-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedImage,
          brandStyle: selectedStyle
        })
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.results)
        setVideoResults({}) // Clear previous video results
        setStatusMessage("✅ Prompts generated successfully!")
        setTimeout(() => setStatusMessage(""), 3000)
      } else {
        setErrorMessage(data.error || "Failed to generate prompts")
      }
    } catch (error) {
      setErrorMessage("Failed to generate prompts")
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyPrompt = (prompt: string, style: string) => {
    navigator.clipboard.writeText(prompt)
    setCopiedPrompt(style)
    console.log("Prompt copied to clipboard")
    setTimeout(() => setCopiedPrompt(null), 2000)
  }

  const loadQuickImage = (url: string) => {
    setSelectedImage(url)
    setSelectedFile(null)
    setResults(null)
    setVideoResults({})
  }

  const generateVideo = async (prompt: string, style: string) => {
    if (!selectedImage) {
      setErrorMessage("Please select an image first")
      return
    }

    setGeneratingVideo(style)
    setErrorMessage("")
    setStatusMessage(`🎬 Generating video for ${style} style...`)
    
    try {
      const response = await fetch("/api/sandbox-runway-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedImage,
          prompt: prompt
        })
      })

      const data = await response.json()
      if (data.success) {
        setVideoResults(prev => ({
          ...prev,
          [style]: {
            videoUrl: data.videoUrl,
            taskId: data.taskId,
            prompt: data.prompt,
            attempts: data.attempts
          }
        }))
        setStatusMessage(`✅ Video generated for ${style}! (${data.attempts} attempts)`)
        setTimeout(() => setStatusMessage(""), 5000)
      } else {
        setErrorMessage(`❌ Video generation failed for ${style}: ${data.error}`)
        console.error("Video generation error:", data.details)
      }
    } catch (error) {
      setErrorMessage(`❌ Video generation failed for ${style}`)
      console.error("Video generation error:", error)
    } finally {
      setGeneratingVideo(null)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#1f2937' }}>
          Runway Prompt Sandbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
          Test GPT-4o Vision to Runway prompt generation with different images and brand styles
        </p>
        
        {/* Status Messages */}
        {statusMessage && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#dcfce7', 
            color: '#166534', 
            borderRadius: '8px', 
            marginTop: '10px',
            border: '1px solid #bbf7d0'
          }}>
            {statusMessage}
          </div>
        )}
        
        {errorMessage && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fef2f2', 
            color: '#991b1b', 
            borderRadius: '8px', 
            marginTop: '10px',
            border: '1px solid #fecaca'
          }}>
            {errorMessage}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Left Column - Upload & Controls */}
        <div>
          {/* Image Upload */}
          <div style={{ 
            border: '3px dashed #d1d5db', 
            borderRadius: '12px', 
            padding: '40px', 
            textAlign: 'center',
            marginBottom: '20px',
            backgroundColor: '#f9fafb'
          }}>
            {selectedImage ? (
              <div>
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  style={{ maxHeight: '300px', width: 'auto', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'block', margin: '0 auto' }}
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => console.error('Image failed to load:', e)}
                />
                {selectedFile && <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.9rem' }}>{selectedFile.name}</p>}
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '5px' }}>
                  Image loaded: {selectedImage.substring(0, 50)}...
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📁</div>
                <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Upload an image to test</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <div style={{ marginTop: '15px' }}>
              <label 
                htmlFor="image-upload"
                style={{ 
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {selectedImage ? "Change Image" : "Choose Image"}
              </label>
            </div>
          </div>

          {/* Brand Style Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
              Brand Style
            </label>
            <select 
              value={selectedStyle} 
              onChange={(e) => setSelectedStyle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                backgroundColor: 'white'
              }}
            >
              <option value="all">Test All Styles</option>
              {BRAND_STYLES.map(style => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button 
            onClick={() => {
              console.log('Button clicked! selectedImage:', !!selectedImage, 'isGenerating:', isGenerating)
              generatePrompts()
            }} 
            disabled={!selectedImage || isGenerating}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: !selectedImage || isGenerating ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: !selectedImage || isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            {isGenerating ? "⏳ Generating Prompts..." : "Generate Runway Prompts"}
          </button>
          
          {/* Debug Info */}
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
            Debug: Image loaded: {selectedImage ? '✅ YES' : '❌ NO'} | Generating: {isGenerating ? 'YES' : 'NO'}
          </div>
        </div>

        {/* Right Column - Results */}
        <div>
          {results && (
            <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', fontWeight: '600' }}>Generated Prompts</h3>
              {Object.entries(results).map(([style, data]: [string, any]) => (
                <PromptResult 
                  key={style}
                  style={style} 
                  data={data} 
                  onCopy={copyPrompt}
                  copied={copiedPrompt === style}
                  onGenerateVideo={generateVideo}
                  generatingVideo={generatingVideo === style}
                  videoResult={videoResults[style]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Test Images */}
      <div style={{ 
        backgroundColor: '#ffffff', 
        border: '2px solid #e5e7eb', 
        borderRadius: '12px', 
        padding: '24px' 
      }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.3rem', fontWeight: '600' }}>Quick Test Images</h3>
        <p style={{ marginBottom: '20px', color: '#6b7280' }}>Click any image below to test it</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {[
            { url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80", label: "Perfume" },
            { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80", label: "Headphones" },
            { url: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=80", label: "Watch" },
            { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", label: "Shoes" },
            { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80", label: "Coffee" },
          ].map((img, idx) => (
            <div 
              key={idx}
              style={{ cursor: 'pointer', textAlign: 'center' }}
              onClick={() => loadQuickImage(img.url)}
            >
              <img 
                src={img.url} 
                alt={img.label}
                style={{ 
                  width: '100%', 
                  height: '120px', 
                  objectFit: 'cover', 
                  borderRadius: '8px',
                  border: '2px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.border = '2px solid #3b82f6'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.border = '2px solid transparent'
                }}
              />
              <p style={{ fontSize: '0.8rem', marginTop: '6px', color: '#6b7280' }}>{img.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PromptResult({ style, data, onCopy, copied, onGenerateVideo, generatingVideo, videoResult }: any) {
  return (
    <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {/* Style Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>
          {style}
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onCopy(data.prompt, style)}
            style={{
              padding: '6px 12px',
              backgroundColor: copied ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <button
            onClick={() => onGenerateVideo(data.prompt, style)}
            disabled={generatingVideo}
            style={{
              padding: '6px 12px',
              backgroundColor: generatingVideo ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: generatingVideo ? 'not-allowed' : 'pointer'
            }}
          >
            {generatingVideo ? '⏳ Generating...' : '🎬 Generate Video'}
          </button>
        </div>
      </div>

      {/* Prompt */}
      <div style={{ 
        backgroundColor: '#f9fafb', 
        padding: '12px', 
        borderRadius: '6px', 
        border: '1px solid #e5e7eb',
        marginBottom: '12px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        lineHeight: '1.4',
        wordBreak: 'break-all'
      }}>
        {data.prompt}
      </div>

      {/* Validation Badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {[
          { label: 'Subject', valid: data.validation.hasSubject },
          { label: 'Camera', valid: data.validation.hasCamera },
          { label: 'Lighting', valid: data.validation.hasLighting },
          { label: '5s Length', valid: data.validation.hasLength },
          { label: 'Negatives', valid: data.validation.hasEnhancedNegatives },
        ].map(({ label, valid }) => (
          <span
            key={label}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              backgroundColor: valid ? '#dcfce7' : '#fef2f2',
              color: valid ? '#166534' : '#991b1b',
              border: `1px solid ${valid ? '#bbf7d0' : '#fecaca'}`
            }}
          >
            {valid ? '✓' : '✗'} {label}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
        <span>Length: {data.promptLength} chars</span>
        <span style={{ color: data.validation.isUnder75Chars ? '#059669' : '#d97706' }}>
          {data.validation.isUnder75Chars ? '✓ Under 75 chars' : '⚠ Over 75 chars'}
        </span>
      </div>

      {/* Video Result */}
      {videoResult && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
          <h5 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: '#0ea5e9' }}>
            🎬 Generated Video
          </h5>
          <video 
            src={videoResult.videoUrl} 
            controls 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}
            onLoadStart={() => console.log('Video loading started')}
            onError={(e) => console.error('Video load error:', e)}
          />
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
            Task ID: {videoResult.taskId} | Attempts: {videoResult.attempts}
          </div>
        </div>
      )}
    </div>
  )
}