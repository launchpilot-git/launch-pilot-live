"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function CompletingSignIn() {
  const router = useRouter()

  useEffect(() => {
    // Check if we actually have tokens in the URL (successful auth)
    if (window.location.hash.includes('access_token')) {
      // Redirect to dashboard on successful auth
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f4c537] mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Completing Sign In...
        </h1>
        <p className="text-gray-600 mb-6">
          Please wait while we sign you in to your account.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          If this takes longer than expected, you can try signing in again.
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#f4c537] text-[#2c0e31] rounded-full px-6 py-3 font-medium hover:bg-[#eab72c] transition"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}