import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, brandStyle, businessName = "TestBusiness", industry = "retail" } = await request.json()

    if (!imageUrl || !brandStyle) {
      return NextResponse.json(
        { error: "imageUrl and brandStyle are required" },
        { status: 400 }
      )
    }

    // Test all brand styles if not specified
    const stylesToTest = brandStyle === "all" 
      ? ["bold", "witty", "casual", "elegant", "uplifting", "fun", "empowering", "minimalist"]
      : [brandStyle]

    const results: Record<string, any> = {}

    for (const style of stylesToTest) {
      // Use the exact same prompt from process-job route
      const cinematicPrompt = `You are creating a prompt for Runway Gen-4 Turbo video generation. Analyze this product image and generate a Runway-optimized prompt.

CRITICAL ANALYSIS PHASE:
First, analyze the image to determine:
1. Product category (beauty/tech/fashion/food/automotive/home/other)
2. Background complexity (simple/complex)
3. Lighting conditions
4. Overall composition

ENHANCED PROMPT TEMPLATE:
{SUBJECT}, {ENHANCED_MOTION}, {ENVIRONMENT}, {LIGHTING} --length 5s --no text watermark blurry distorted duplicate mutation deformed low quality artifacts grain pixelated

ASSEMBLY GUIDELINES:

1. SUBJECT: Extract core product in 6 words or less (e.g., "crystal perfume bottle", "sleek wireless headphones")

2. ENHANCED MOTION: Use brand tone mapping for "${style}":
   - bold → "dramatic push-in with slight upward tilt"
   - witty → "playful bounce-in with gentle left pan"
   - casual → "handheld drift-right with natural sway"
   - elegant → "smooth arc-right with gradual pullback"
   - uplifting → "ascending dolly-in with brightening exposure"
   - fun → "energetic pan-left with slight zoom pulse"
   - empowering → "steady rise-up with confident forward push"
   - minimalist → "zen-like slow zoom with static frame"

3. PRODUCT CATEGORY OVERRIDE (if applicable):
   - beauty → "luxurious reveal with soft glow"
   - tech → "precision engineering showcase with clean lines"
   - fashion → "elegant fabric flow with natural lighting"
   - food → "appetizing close-up with warm ambient light"
   - automotive → "dynamic reveal with dramatic shadows"
   - home → "cozy lifestyle pan with inviting warmth"

4. ENVIRONMENT: Add only if background is simple (e.g., "marble surface", "clean studio")

5. LIGHTING: Choose based on image analysis: "soft studio lighting", "natural light", "dramatic lighting"

6. DURATION: Always use 5s for products (optimal quality)

7. NEGATIVE PROMPTS: Always end with full negative prompt list

VALIDATION RULES:
- Keep total prompt under 75 characters (excluding negative prompts)
- Never combine conflicting movements
- Always include motion speed modifier (smooth, gentle, deliberate)
- Avoid: fast, rapid, sudden (cause jitter)

Output ONLY the final prompt string. Example:
crystal perfume bottle, smooth arc-right with gradual pullback, marble surface, soft studio lighting --length 5s --no text watermark blurry distorted duplicate mutation deformed low quality artifacts grain pixelated`

      console.log(`Testing style: ${style}`)

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: cinematicPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      })

      const generatedPrompt = response.choices[0]?.message?.content || ""
      
      // Parse the generated prompt to verify it follows the format
      const hasSubject = generatedPrompt.includes(",")
      const hasCamera = generatedPrompt.includes("push-in") || generatedPrompt.includes("tilt-up") || 
                       generatedPrompt.includes("pan-left") || generatedPrompt.includes("pan-right") || 
                       generatedPrompt.includes("dolly-in") || generatedPrompt.includes("tilt-down") || 
                       generatedPrompt.includes("zoom-in") || generatedPrompt.includes("drift-right") ||
                       generatedPrompt.includes("arc-right") || generatedPrompt.includes("bounce-in") ||
                       generatedPrompt.includes("rise-up") || generatedPrompt.includes("reveal") ||
                       generatedPrompt.includes("showcase") || generatedPrompt.includes("flow") ||
                       generatedPrompt.includes("close-up") || generatedPrompt.includes("lifestyle pan")
      const hasLighting = generatedPrompt.includes("lighting") || generatedPrompt.includes("light")
      const hasLength = generatedPrompt.includes("--length 5s")
      const hasEnhancedNegatives = generatedPrompt.includes("--no text watermark blurry distorted duplicate mutation deformed low quality artifacts grain pixelated")
      const isUnder75Chars = generatedPrompt.indexOf("--no") < 75

      results[style] = {
        prompt: generatedPrompt,
        validation: {
          hasSubject,
          hasCamera,
          hasLighting,
          hasLength,
          hasEnhancedNegatives,
          isUnder75Chars,
          isValid: hasSubject && hasCamera && hasLighting && hasLength && hasEnhancedNegatives
        },
        promptLength: generatedPrompt.indexOf("--no") > 0 ? generatedPrompt.indexOf("--no") : generatedPrompt.length,
        usage: response.usage
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      results,
      summary: {
        totalStyles: stylesToTest.length,
        validPrompts: Object.values(results).filter((r: any) => r.validation.isValid).length,
        invalidPrompts: Object.values(results).filter((r: any) => !r.validation.isValid).length
      }
    })

  } catch (error) {
    console.error("Test error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return NextResponse.json(
      {
        error: "Failed to test Runway prompt generation",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}

// GET method for easy testing with a sample image
export async function GET() {
  // Sample product images for testing
  const sampleImages = {
    perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80",
    headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    watch: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80",
    shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80"
  }

  return NextResponse.json({
    message: "Test the Runway prompt generation",
    endpoint: "POST /api/test-runway-prompt",
    requiredParams: {
      imageUrl: "URL of product image",
      brandStyle: "One of: bold, witty, casual, elegant, uplifting, fun, empowering, minimalist, or 'all' to test all styles"
    },
    sampleImages,
    exampleRequest: {
      imageUrl: sampleImages.perfume,
      brandStyle: "elegant"
    }
  })
}