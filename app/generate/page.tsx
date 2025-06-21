"use client"

import { useEffect } from "react"
import { redirect } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function GeneratePage() {
  const { user, loading: authLoading, plan } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      redirect('/signup')
    } else if (!authLoading && user) {
      if (plan === 'pro') {
        redirect("/generate/pro")
      } else {
        redirect("/generate/free")
      }
    }
  }, [user, authLoading, plan])

  // Show loading while checking auth and plan
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}