"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronDown, LogOut, Sparkles } from "lucide-react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useState } from "react"

function UserMenu({ user, signOut }: { user: any, signOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [dropdownAvatarError, setDropdownAvatarError] = useState(false)
  
  // Get user's initials for avatar
  const getInitials = (email: string) => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md group"
      >
        {user?.user_metadata?.avatar_url && !avatarError ? (
          <img 
            src={user.user_metadata.avatar_url} 
            alt={userName}
            className="w-6 h-6 rounded-full ring-2 ring-[#f4c537]/20"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-6 h-6 bg-gradient-to-br from-[#f4c537] to-[#eab72c] rounded-full flex items-center justify-center text-white text-xs font-medium">
            {getInitials(user?.email || '')}
          </div>
        )}
        <span className="text-sm font-medium text-[#2c0e31] max-w-24 truncate hidden sm:block">
          {userName}
        </span>
        <ChevronDown className={`w-3 h-3 text-[#2c0e31]/60 transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl z-20 py-2">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {user?.user_metadata?.avatar_url && !dropdownAvatarError ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={userName}
                    className="w-10 h-10 rounded-full ring-2 ring-[#f4c537]/20"
                    onError={() => setDropdownAvatarError(true)}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#f4c537] to-[#eab72c] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(user?.email || '')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#2c0e31] truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-[#2c0e31]/60 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            
            
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Navbar({ isPro = false, hasProjects = false }: { isPro?: boolean, hasProjects?: boolean }) {
  const { user, loading, signOut, plan } = useAuth()
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/generate')
  const isHomepage = pathname === '/'
  
  return (
    <header className="bg-white/80 backdrop-blur-xl rounded-xl py-3 px-3 sm:px-6 flex items-center justify-between mb-4 border border-white/15 shadow-[0px_10px_40px_rgba(0,0,0,0.08)]">
      <div className="flex-shrink-0">
        <Link href="/" className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Launch%20Pilot%20logo-ydsxoczqasja6khtRgX11zLKZZ3VjP.png"
            alt="Launch Pilot"
            width={150}
            height={40}
            className="h-8 sm:h-10 w-auto"
          />
        </Link>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {loading ? (
          <div className="flex items-center space-x-3">
            <div className="animate-pulse bg-gray-200 rounded-full px-4 py-1.5 w-24 h-8"></div>
            <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
          </div>
        ) : user ? (
          <>
            {isDashboard && hasProjects ? (
              <>
                {plan === 'pro' && (
                  <div className="bg-[#f4c537] text-[#2c0e31] rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold uppercase shadow-sm flex items-center gap-1 sm:gap-1.5">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span className="hidden sm:inline">PRO</span>
                  </div>
                )}
                <UserMenu user={user} signOut={signOut} />
              </>
            ) : (
              <>
                {/* Show Dashboard button when not on dashboard or when on homepage */}
                <Link
                  href="/dashboard"
                  className="text-[#2c0e31] border border-[#2c0e31] rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium hover:bg-[#2c0e31] hover:text-white transition-all duration-200"
                >
                  Dashboard
                </Link>
                {plan === 'pro' && (
                  <div className="bg-[#f4c537] text-[#2c0e31] rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold uppercase shadow-sm flex items-center gap-1 sm:gap-1.5">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span className="hidden sm:inline">PRO</span>
                  </div>
                )}
                <UserMenu user={user} signOut={signOut} />
              </>
            )}
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="text-[#2c0e31] border border-[#2c0e31] rounded-full px-4 py-1.5 text-sm font-medium hover:bg-[#2c0e31] hover:text-white transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-[#f4c537] text-[#2c0e31] rounded-full px-4 py-1.5 text-sm font-medium hover:bg-[#eab72c] transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}