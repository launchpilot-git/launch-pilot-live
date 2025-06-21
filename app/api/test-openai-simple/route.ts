import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function GET(request: NextRequest) {
  try {
    // Log environment variables (will be visible in Vercel logs)
    console.log("Environment check:", {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })

    // Try to initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    // Simple test request
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a simpler model for testing
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10,
    })

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content || "",
      model: response.model,
    })
  } catch (error) {
    console.error("OpenAI test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
