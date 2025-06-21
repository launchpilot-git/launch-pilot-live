"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AuthCodeError() {
  const router = useRouter()
  const [isLoginFlow, setIsLoginFlow] = useState(false)

  useEffect(() => {
    // Check if we actually have tokens in the URL (successful auth)
    if (window.location.hash.includes('access_token')) {
      // Redirect to dashboard on successful auth
      router.push('/dashboard')
      return
    }

    // Detect if this came from login or signup by checking referrer
    const referrer = document.referrer
    const isFromLogin = referrer.includes('/login') || 
                       sessionStorage.getItem('auth-flow') === 'login' ||
                       window.location.search.includes('from=login')
    
    setIsLoginFlow(isFromLogin)
    
    // Set a timeout to redirect if stuck too long
    const timeout = setTimeout(() => {
      console.log('Auth taking too long, redirecting...')
      router.push(isFromLogin ? '/login' : '/signup')
    }, 10000) // 10 seconds

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f4c537] mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isLoginFlow ? 'Completing Sign In...' : 'We\'re Setting Up Your Dashboard'}
        </h1>
        <p className="text-gray-600 mb-6">
          {isLoginFlow 
            ? 'Please wait while we sign you in to your account.'
            : 'Just give us a couple of minutes while we set up your personalized dashboard and get everything ready for you.'
          }
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {isLoginFlow
            ? 'If this takes longer than expected, you can try signing in again.'
            : 'This usually takes less than a minute. If this is taking too long, you can try signing up again.'
          }
        </p>
        <Link
          href={isLoginFlow ? "/login" : "/signup"}
          className="inline-block bg-[#f4c537] text-[#2c0e31] rounded-full px-6 py-3 font-medium hover:bg-[#eab72c] transition"
        >
          {isLoginFlow ? 'Back to Login' : 'Back to Sign Up'}
        </Link>
      </div>
    </div>
  )
}