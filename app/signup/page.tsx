"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { signUpWithEmail, signUpWithGoogle } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/hooks/useAuth"

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setMessage('')

    // Generate a secure random password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12)
    const { data, error } = await signUpWithEmail(email, tempPassword)
    
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for a confirmation link!')
    }
    
    setIsLoading(false)
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    setMessage('')
    
    // Mark this as a signup flow
    sessionStorage.setItem('auth-flow', 'signup')
    
    const { error } = await signUpWithGoogle()
    
    if (error) {
      setMessage(error.message)
      setIsGoogleLoading(false)
      sessionStorage.removeItem('auth-flow')
    }
    // Note: Don't reset loading on success - user will be redirected
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#feebea] via-[#fff1d5] to-[#fff6d7]">
      <div className="container mx-auto px-4 pt-4">
        <Navbar />
      </div>
      
      {/* Main Content - Single Column with Gradient Background */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2c0e31] mb-2">Welcome to Launch Pilot</h1>
              <p className="text-gray-500 text-base sm:text-lg">Your AI assistant for marketing content</p>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4 sm:space-y-8">
              {/* Email Field */}
              <div>
                <label className="block text-gray-700 text-base sm:text-lg font-medium mb-2 sm:mb-3">
                  Email
                </label>
                <div>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-4 border border-gray-400 rounded-xl text-base focus:border-[#f4c537] focus:ring-1 focus:ring-[#f4c537]/20 bg-white shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`text-center text-sm ${
                  message.includes('Check your email') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {message}
                </div>
              )}

              {/* Continue Button */}
              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 bg-[#f4c537] hover:bg-[#eab72c] text-[#2c0e31] text-base font-medium rounded-xl border border-[#d4a017] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Sign up with email'}
              </Button>

              {/* Terms Text */}
              <p className="text-center text-xs sm:text-sm text-gray-500 px-2">
                By signing up, you agree to the{" "}
                <Link href="/terms" className="text-[#2c0e31] hover:underline">
                  Terms of Use
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-[#2c0e31] hover:underline">
                  Privacy Notice
                </Link>
                , and{" "}
                <Link href="/cookies" className="text-[#2c0e31] hover:underline">
                  Cookie Notice
                </Link>
              </p>

              {/* Divider */}
              <div className="relative flex items-center my-4 sm:my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-3 sm:px-4 text-gray-500 bg-white text-sm sm:text-base">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Google Sign In */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isLoading || isGoogleLoading}
                  className="h-11 px-4 sm:px-8 flex items-center justify-center space-x-2 sm:space-x-3 border border-gray-400 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm hover:shadow-md transition-all disabled:opacity-50 relative text-sm sm:text-base"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 15 9.99984 15C7.23859 15 4.99984 12.7612 4.99984 10C4.99984 7.23871 7.23859 5 9.99984 5C11.2744 5 12.4344 5.48683 13.3169 6.28537L15.674 3.92829C14.1857 2.52004 12.1948 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 10C1.6665 14.6021 5.39775 18.3333 9.99984 18.3333C14.6019 18.3333 18.3332 14.6021 18.3332 10C18.3332 9.44121 18.2757 8.89583 18.1711 8.36788Z"
                          fill="#FFC107"
                        />
                        <path
                          d="M2.62744 6.12121L5.36536 8.12913C6.10619 6.29496 7.90036 5 9.99994 5C11.2745 5 12.4345 5.48683 13.317 6.28537L15.6741 3.92829C14.1858 2.52004 12.1949 1.66663 9.99994 1.66663C6.74077 1.66663 3.91327 3.47371 2.62744 6.12121Z"
                          fill="#FF3D00"
                        />
                        <path
                          d="M10 18.3333C12.1525 18.3333 14.1084 17.5096 15.5871 16.1429L13.008 13.9625C12.1432 14.6217 11.0865 15 10 15C7.83255 15 5.99213 13.6179 5.2988 11.6892L2.58047 13.7829C3.84964 16.4817 6.70913 18.3333 10 18.3333Z"
                          fill="#4CAF50"
                        />
                        <path
                          d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.3809 12.5908 13.7889 13.3972 13.0067 13.9629L13.0079 13.9621L15.5871 16.1425C15.4046 16.3096 18.3332 14.1666 18.3332 10C18.3332 9.44121 18.2757 8.89583 18.1711 8.36788Z"
                          fill="#1976D2"
                        />
                      </svg>
                      <span>Sign up with Google</span>
                    </>
                  )}
                </button>
              </div>

              {/* Login link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#2c0e31] hover:underline font-medium">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

