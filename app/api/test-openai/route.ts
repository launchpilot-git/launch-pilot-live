import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test OpenAI endpoint called')
    
    const { message } = await request.json()
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ No OpenAI API key found')
      console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')))
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('✅ OpenAI API key found, length:', process.env.OPENAI_API_KEY.length)

    console.log('🤖 Making OpenAI API call...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: message || "Say 'OpenAI test successful' if you can read this."
        }
      ],
      max_tokens: 50
    })

    const response = completion.choices[0]?.message?.content || 'No response'
    console.log('✅ OpenAI response:', response)

    return NextResponse.json({ 
      success: true, 
      response,
      model: completion.model,
      usage: completion.usage
    })

  } catch (error) {
    console.error('❌ OpenAI test error:', error)
    return NextResponse.json(
      { 
        error: 'OpenAI API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
