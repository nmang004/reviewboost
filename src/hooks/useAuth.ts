import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkingUser = useRef(false)
  
  // Create a stable Supabase client instance
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  // Simplified checkUser function
  const checkUser = useCallback(async (forceCheck = false) => {
    if (checkingUser.current && !forceCheck) {
      console.log('CheckUser already running, skipping...')
      return
    }
    
    checkingUser.current = true
    console.log('CheckUser starting...')
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log('Auth user retrieved:', authUser?.email || 'none')
      
      if (authUser) {
        // First try normal profile query
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          console.log('Profile found:', profile.email)
          setUser(profile)
        } else if (authUser.email) {
          // Fallback to auth metadata if profile not found
          console.log('No profile found, using fallback for:', authUser.email)
          const fallbackProfile: User = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            role: authUser.user_metadata?.role || 'employee',
            created_at: authUser.created_at
          }
          setUser(fallbackProfile)
        } else {
          console.log('No email found, setting user to null')
          setUser(null)
        }
      } else {
        console.log('No auth user, setting user to null')
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      console.log('CheckUser complete, setting loading to false')
      setLoading(false)
      checkingUser.current = false
    }
  }, [supabase])

  useEffect(() => {
    // Initial user check
    checkUser()
    
    // Fallback timeout to ensure loading doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      console.log('Auth loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 5000) // 5 second timeout
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(loadingTimeout) // Clear timeout if auth state changes
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Directly handle the session from the event instead of calling checkUser again
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profile) {
              setUser(profile)
            } else {
              // Fallback to auth metadata if profile not found
              const fallbackProfile: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
                role: session.user.user_metadata?.role || 'employee',
                created_at: session.user.created_at
              }
              setUser(fallbackProfile)
            }
          } catch (error) {
            console.error('Error in auth state change:', error)
            setUser(null)
          }
        } else {
          setUser(null)
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, checkUser])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Auth error:', error)
      throw error
    }
    
    // The auth state change listener will handle updating the user
    return { data, error }
  }, [supabase])

  const signUp = useCallback(async (email: string, password: string, name: string, role: 'employee' | 'business_owner') => {
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
    
    if (error) {
      console.error('Auth signup error:', error)
      throw error
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.user.email_confirmed_at) {
      return { 
        data, 
        error, 
        needsEmailConfirmation: true 
      }
    }
    
    // If user is immediately confirmed, create profile
    if (data.user && data.user.email_confirmed_at) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name,
          role,
        })
      
      if (profileError) {
        console.error('Error creating user profile:', profileError)
      }
    }
    
    return { data, error }
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }, [supabase])

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}