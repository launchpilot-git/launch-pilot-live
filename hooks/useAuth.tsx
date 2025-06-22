"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  plan: 'free' | 'pro' | null
  generationsUsed: number
  canGenerate: boolean
  error: string | null
  retryAuth: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  plan: null,
  generationsUsed: 0,
  canGenerate: true,
  error: null,
  retryAuth: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [generationsUsed, setGenerationsUsed] = useState(0)
  const [canGenerate, setCanGenerate] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeRequests, setActiveRequests] = useState(new Set<string>())

  const fetchUserData = async (userId: string) => {
    // Don't fetch data if no userId provided
    if (!userId) {
      console.log('No userId provided, skipping fetchUserData')
      return
    }

    // Prevent duplicate requests for the same user
    const requestKey = `fetchUserData-${userId}`
    if (activeRequests.has(requestKey)) {
      console.log('Skipping duplicate fetchUserData request for user:', userId)
      return
    }
    
    setActiveRequests(prev => new Set([...prev, requestKey]))

    // Prevent infinite loops
    if (fetchAttempts >= 3) {
      console.warn('Max fetch attempts reached, using default values')
      setPlan('free')
      setGenerationsUsed(0)
      setCanGenerate(true)
      return
    }

    try {
      setFetchAttempts(prev => prev + 1)
      
      // Query the user's plan from the profiles table
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('plan, generations_used')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.log('Database query result:', {
          code: error.code,
          message: error.message,
          userId: userId
        })
        
        // If profile doesn't exist yet (new user), wait a moment for trigger then try to create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, waiting for trigger or creating manually for user:', userId)
          
          // Wait a moment for the database trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Try fetching again first
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('plan, generations_used')
            .eq('id', userId)
            .single()
            
          if (retryData) {
            console.log('Profile found after waiting:', retryData)
            setPlan(retryData.plan || 'free')
            setGenerationsUsed(retryData.generations_used || 0)
            setCanGenerate(retryData.plan === 'pro' || (retryData.generations_used || 0) < 3)
            setFetchAttempts(0)
            return
          }
          
          // If still not found, create manually
          console.log('Creating new profile manually for user:', userId)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: userId,
              plan: 'free',
              generations_used: 0,
              generations_reset_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          console.log('Profile creation attempt result:', { insertError: insertError?.message || null })
          
          if (insertError) {
            console.error('Error creating profile:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details
            })
            // Use defaults if profile creation fails
            setPlan('free')
            setGenerationsUsed(0)
            setCanGenerate(true)
          } else {
            console.log('Profile created successfully')
            setPlan('free')
            setGenerationsUsed(0)
            setCanGenerate(true)
          }
        } else {
          // For other errors, use default values
          console.warn('Using default values due to database error')
          setPlan('free')
          setGenerationsUsed(0)
          setCanGenerate(true)
        }
      } else if (userData) {
        console.log('User data fetched successfully:', userData)
        setPlan(userData.plan || 'free')
        setGenerationsUsed(userData.generations_used || 0)
        setCanGenerate(userData.plan === 'pro' || (userData.generations_used || 0) < 3)
        setFetchAttempts(0) // Reset attempts on success
      }
    } catch (error) {
      console.error('Unexpected error in fetchUserData:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId
      })
      
      // Use default values as fallback
      setPlan('free')
      setGenerationsUsed(0)
      setCanGenerate(true)
    } finally {
      // Clean up the active request
      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestKey)
        return newSet
      })
    }
  }

  const refreshUserData = async () => {
    if (user?.id) {
      setFetchAttempts(0) // Reset attempts for manual refresh
      await fetchUserData(user.id)
    }
  }

  // Get initial session function
  const getInitialSession = async (mounted = true) => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Add 10-second timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 10000)
        )
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
        console.log('📊 Session result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message
        })
        
        if (error) {
          console.error('❌ Error getting session:', error)
          
          // Try session refresh as fallback
          console.log('🔄 Attempting session refresh fallback...')
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshedSession && mounted) {
              console.log('✅ Session refresh successful')
              setUser(refreshedSession.user)
              setError(null) // Clear any previous errors
              if (refreshedSession.user?.id) {
                await fetchUserData(refreshedSession.user.id)
              }
              setLoading(false)
              return
            }
          } catch (refreshErr) {
            console.error('❌ Session refresh failed:', refreshErr)
          }
          
          if (mounted) {
            setUser(null)
            setError('Failed to load authentication. Please try refreshing the page.')
            setLoading(false)
          }
          return
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          setError(null) // Clear any previous errors on successful session
          if (session?.user?.id) {
            console.log('👤 Fetching user data for:', session.user.id)
            await fetchUserData(session.user.id)
          } else {
            console.log('❌ No user in session')
          }
          setLoading(false)
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('💥 Unexpected error in getInitialSession:', error)
        
        // Try session refresh as fallback for unexpected errors
        if (mounted) {
          console.log('🔄 Attempting session refresh after unexpected error...')
          try {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshedSession) {
              console.log('✅ Session refresh successful after error')
              setUser(refreshedSession.user)
              if (refreshedSession.user?.id) {
                await fetchUserData(refreshedSession.user.id)
              }
              setLoading(false)
              setIsInitialized(true)
              return
            }
          } catch (refreshErr) {
            console.error('❌ Session refresh failed after error:', refreshErr)
          }
          
          setUser(null)
          setError('Authentication failed. Please try refreshing the page.')
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

  // Retry mechanism for authentication
  const retryAuth = async () => {
    console.log('🔄 Manual auth retry triggered')
    setLoading(true)
    setError(null)
    setFetchAttempts(0)
    await getInitialSession()
  }

  useEffect(() => {
    let mounted = true
    let authStateTimeout: NodeJS.Timeout

    getInitialSession(mounted)

    // Listen for auth changes with debouncing
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip initial events if we're already initialized to prevent duplicate processing
      if (isInitialized && event === 'INITIAL_SESSION') {
        console.log('🔄 Skipping duplicate INITIAL_SESSION event')
        return
      }
      
      console.log('🔄 Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        isInitialized
      })
      
      // Clear any pending auth state updates
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      
      // Debounce auth state changes to prevent rapid-fire updates
      authStateTimeout = setTimeout(async () => {
        if (mounted) {
          setUser(session?.user ?? null)
          setFetchAttempts(0) // Reset attempts on auth change
          
          if (session?.user?.id) {
            console.log('👤 Auth change - fetching user data for:', session.user.id)
            await fetchUserData(session.user.id)
          } else {
            console.log('❌ Auth change - no user in session')
          }
          
          // Handle sign out redirect
          if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
            console.log('🚪 User signed out, redirecting...')
            // Small delay to ensure state is updated
            setTimeout(() => {
              window.location.href = '/'
            }, 100)
          }
          
          setLoading(false)
        }
      }, 100) // 100ms debounce
    })

    return () => {
      mounted = false
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      subscription.unsubscribe()
    }
  }, [isInitialized])

  const signOut = async () => {
    try {
      setFetchAttempts(0) // Reset attempts on sign out
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setPlan(null)
      setGenerationsUsed(0)
      setError(null)
      
      // Redirect to homepage
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Failed to sign out. Please try again.')
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, plan, generationsUsed, canGenerate, error, retryAuth, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // Return default values during SSR or when provider is not available
    return {
      user: null,
      loading: true,
      plan: null,
      generationsUsed: 0,
      canGenerate: false,
      error: null,
      retryAuth: async () => {},
      signOut: async () => {},
      refreshUserData: async () => {}
    }
  }
  return context
}