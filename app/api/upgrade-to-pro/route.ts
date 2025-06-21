import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Auth error:", userError)
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      )
    }

    // Create service role client for database updates
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user to pro plan
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        plan: 'pro',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error("Error upgrading user to pro:", updateError)
      return NextResponse.json(
        { error: "Failed to upgrade user plan" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: "Successfully upgraded to Pro plan",
      plan: "pro"
    })

  } catch (error) {
    console.error("Error in upgrade-to-pro endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}