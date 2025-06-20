import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkingUser = useRef(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTime = useRef<number>(0)
  const lastSuccessfulAuth = useRef<{ user: User | null; timestamp: number }>({ user: null, timestamp: 0 })
  const visibilityTimer = useRef<NodeJS.Timeout | null>(null)

  // Debounced checkUser to prevent rapid successive calls
  const debouncedCheckUser = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      checkUser()
    }, 250) // Increased debounce to 250ms
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle page visibility changes to avoid auth checks on tab switches
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Only check auth if the page has been hidden for more than 5 minutes
      // or if we don't have a recent successful auth
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (now - lastSuccessfulAuth.current.timestamp > fiveMinutes) {
        // Clear any existing timer
        if (visibilityTimer.current) {
          clearTimeout(visibilityTimer.current)
        }
        
        // Wait a bit before checking to avoid immediate auth on tab switch
        visibilityTimer.current = setTimeout(() => {
          debouncedCheckUser()
        }, 1000)
      }
    } else {
      // Clear any pending auth checks when tab becomes hidden
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current)
        visibilityTimer.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    checkUser()
    
    // Set up auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      // Only respond to relevant events and use debouncing
      if (event === 'SIGNED_IN') {
        debouncedCheckUser()
      } else if (event === 'TOKEN_REFRESHED') {
        debouncedCheckUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        lastSuccessfulAuth.current = { user: null, timestamp: 0 }
      }
      // Ignore other events like INITIAL_SESSION to prevent unnecessary calls
    })

    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      listener?.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkUser() {
    // Prevent multiple simultaneous calls and rate limiting
    if (checkingUser.current) {
      return
    }

    const now = Date.now()
    
    // Rate limiting: don't check user more than once every 500ms
    if (now - lastCheckTime.current < 500) {
      return
    }

    // Use cached auth if it's recent (less than 30 seconds old)
    if (now - lastSuccessfulAuth.current.timestamp < 30000) {
      if (lastSuccessfulAuth.current.user && !user) {
        setUser(lastSuccessfulAuth.current.user)
        setLoading(false)
      }
      return
    }

    checkingUser.current = true
    lastCheckTime.current = now
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        
        // First try normal profile query
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        // Profile query completed
        
        // If RLS policy prevents access, try with service role context
        if (profileError && profileError.message?.includes('row-level security')) {
          
          // Try creating a basic user profile from auth data
          const fallbackProfile: User = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
            role: authUser.user_metadata?.role || 'employee',
            created_at: authUser.created_at
          }
          
          // Using fallback profile from auth metadata
          setUser(fallbackProfile)
        } else if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile query error:', profileError.message)
          
          // For other errors, still try to create a minimal user from auth data
          if (authUser.email) {
            const fallbackProfile: User = {
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.name || authUser.email.split('@')[0],
              role: authUser.user_metadata?.role || 'employee',
              created_at: authUser.created_at
            }
            // Using fallback profile due to error
            setUser(fallbackProfile)
          } else {
            setUser(null)
          }
        } else if (profile) {
          setUser(profile)
          // Cache successful auth
          lastSuccessfulAuth.current = { user: profile, timestamp: Date.now() }
        } else {
          setUser(null)
          lastSuccessfulAuth.current = { user: null, timestamp: Date.now() }
        }
      } else {
        setUser(null)
        lastSuccessfulAuth.current = { user: null, timestamp: Date.now() }
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
      lastSuccessfulAuth.current = { user: null, timestamp: Date.now() }
    } finally {
      setLoading(false)
      checkingUser.current = false
    }
  }

  async function signIn(email: string, password: string) {
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    // Auth response received
    
    if (error) {
      console.error('Auth error:', error)
      throw error
    }
    
    // Get user profile with role information
    if (data.user) {
      
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      // Profile query completed
      
      if (profile) {
        setUser(profile)
        lastSuccessfulAuth.current = { user: profile as User, timestamp: Date.now() }
        return { data, error, userProfile: profile as User }
      }
    }
    
    return { data, error, userProfile: undefined }
  }

  async function signUp(email: string, password: string, name: string, role: 'employee' | 'business_owner') {
    const redirectUrl = `${window.location.origin}/auth/callback`
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
        emailRedirectTo: redirectUrl
      }
    })
    
    // Signup response received
    
    if (error) {
      console.error('Auth signup error:', error)
      throw error
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.user.email_confirmed_at) {
      
      // Return success but indicate email confirmation is needed
      return { 
        data, 
        error, 
        userProfile: undefined,
        needsEmailConfirmation: true 
      }
    }
    
    // If user is immediately confirmed, create profile
    if (data.user && data.user.email_confirmed_at) {
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name,
          role,
        })
        .select()
        .single()
      
      // Profile creation completed
      
      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Don't throw error here - the user is created, profile creation can be retried
        return { data, error, userProfile: undefined, profileError }
      }
      
      if (profile) {
        setUser(profile)
        lastSuccessfulAuth.current = { user: profile as User, timestamp: Date.now() }
        return { data, error, userProfile: profile as User }
      }
    }
    
    return { data, error, userProfile: undefined }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    lastSuccessfulAuth.current = { user: null, timestamp: 0 }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}