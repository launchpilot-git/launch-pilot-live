"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthSuccess() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthSuccess = async () => {
      console.log('🎉 Auth success page - checking session...')
      
      try {
        // Get the session from the URL hash (if present)
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('📊 Auth success session check:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message
        })

        if (session?.user) {
          console.log('✅ Session found, redirecting to dashboard...')
          router.push('/dashboard')
        } else {
          console.log('❌ No session found, checking URL hash...')
          
          // Try to get session from URL hash
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            console.log('🔑 Found tokens in URL hash, setting session...')
            
            // Set the session manually
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            if (sessionError) {
              console.error('❌ Error setting session:', sessionError)
              router.push('/login')
            } else {
              console.log('✅ Session set successfully, redirecting to dashboard...')
              router.push('/dashboard')
            }
          } else {
            console.log('❌ No tokens found, redirecting to login...')
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('💥 Error in auth success handler:', error)
        router.push('/login')
      }
    }

    handleAuthSuccess()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f4c537] mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Completing Sign In...
        </h1>
        <p className="text-gray-600 mb-6">
          Please wait while we complete your sign in.
        </p>
      </div>
    </div>
  )
}