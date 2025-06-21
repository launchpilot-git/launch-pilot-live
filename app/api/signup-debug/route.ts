import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    
    // Get recent users (last 10)
    const { data: recentUsers, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    })
    
    // Get recent profiles
    const { data: recentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      recentUsers: recentUsers?.users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      })) || [],
      usersError: usersError?.message || null,
      recentProfiles: recentProfiles || [],
      profilesError: profilesError?.message || null
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}