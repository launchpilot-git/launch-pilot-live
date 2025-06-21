import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    
    // Get session from server
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // Get user if session exists
    let user = null
    if (session) {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      user = authUser
    }
    
    return NextResponse.json({
      hasSession: !!session,
      sessionError: sessionError?.message || null,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      accessToken: session?.access_token ? 'present' : 'missing',
      refreshToken: session?.refresh_token ? 'present' : 'missing',
      expiresAt: session?.expires_at || null,
      userFromGetUser: user ? {
        id: user.id,
        email: user.email
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}