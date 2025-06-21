"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { user, loading: authLoading, plan } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect until auth is fully loaded
    if (authLoading) return
    
    // Redirect to signup if no user
    if (!user) {
      router.push('/signup')
      return
    }
    
    // Only redirect when we have a valid plan (not null)
    // This prevents premature redirects before plan data is loaded
    if (plan === 'pro') {
      router.push("/dashboard/pro")
    } else if (plan === 'free') {
      router.push("/dashboard/free")
    }
    // If plan is null, keep showing loading until plan is determined
  }, [user, authLoading, plan, router])

  // Show loading while checking auth and plan
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffe58a] to-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2c0e31] mx-auto mb-2" />
        <p className="text-sm text-[#2c0e31]/60">Loading dashboard...</p>
      </div>
    </div>
  )
}