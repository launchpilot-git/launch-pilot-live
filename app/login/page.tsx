"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, signInWithGoogle } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/navbar'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setMessage('')

    const { data, error } = await signInWithEmail(email, password)
    
    if (error) {
      setMessage(error.message)
    } else {
      router.push('/dashboard')
    }
    
    setIsLoading(false)
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setMessage('')
    
    // Mark this as a login flow
    sessionStorage.setItem('auth-flow', 'login')
    
    const { error } = await signInWithGoogle()
    
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
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-[#2c0e31]">Login</h1>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-8">
              {/* Email Field */}
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-3">
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

              {/* Password Field */}
              <div>
                <label className="block text-gray-700 text-lg font-medium mb-3">
                  Password
                </label>
                <div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 px-4 border border-gray-400 rounded-xl text-base focus:border-[#f4c537] focus:ring-1 focus:ring-[#f4c537]/20 bg-white shadow-sm transition-all"
                    required
                  />
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span className="mr-2">Show password</span>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {message && (
                <div className="text-red-600 text-sm text-center">
                  {message}
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-11 bg-[#f4c537] hover:bg-[#eab72c] text-[#2c0e31] text-base font-medium rounded-xl border border-[#d4a017] shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-gray-600 hover:text-gray-800 underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center my-6">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="px-4 text-gray-500 bg-white text-base">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Google Sign In */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                  className="h-11 px-8 flex items-center justify-center space-x-3 border border-gray-400 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm hover:shadow-md transition-all disabled:opacity-50 relative"
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
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sign up link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-[#2c0e31] hover:underline font-medium">
                    Sign up
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