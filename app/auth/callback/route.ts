import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('Auth callback received:', { 
    code: !!code, 
    error, 
    error_description,
    searchParams: Object.fromEntries(searchParams.entries())
  })

  // If there's an explicit error, redirect to error page
  if (error) {
    console.log('Auth callback error:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
  
  // If there's a code, exchange it for a session
  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (error) {
                console.error('Cookie setting error:', error)
              }
            },
          },
        }
      )
      
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.log('Code exchange error:', exchangeError.message, exchangeError.status)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }
      
      console.log('Auth successful:', { 
        userId: data.user?.id, 
        email: data.user?.email,
        sessionExists: !!data.session
      })
      
      // Redirect directly to dashboard - the session should be properly set by the SSR client
      return NextResponse.redirect(`${origin}/dashboard`)
    } catch (error) {
      console.log('Auth callback exception:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // If no code and no error, this might be a direct visit - redirect to signup
  console.log('No code or error, redirecting to signup')
  return NextResponse.redirect(`${origin}/signup`)
}