import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    let mounted = true
    let processingSignIn = false
    
    // Simple initial check
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!mounted) return
        
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (!mounted) return
          
          if (profile) {
            setUser(profile)
          } else {
            // Fallback profile
            setUser({
              id: authUser.id,
              email: authUser.email!,
              name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
              role: authUser.user_metadata?.role || 'employee',
              created_at: authUser.created_at
            })
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()
    
    // Fallback timeout to ensure loading doesn't get stuck
    const timeout = setTimeout(() => {
      console.log('Auth timeout reached, forcing loading to false')
      if (mounted) setLoading(false)
    }, 3000)
    
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, session?.user?.email)
      
      if (!mounted) return
      
      if (event === 'SIGNED_IN' && session?.user) {
        if (processingSignIn) {
          console.log('⏭️ Skipping duplicate SIGNED_IN event')
          return
        }
        
        processingSignIn = true
        console.log('🔄 Processing SIGNED_IN event for:', session.user.email)
        
        // Always set loading to false first to prevent infinite loops
        setLoading(false)
        
        try {
          console.log('🔍 About to query profile for user:', session.user.id)
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          console.log('🔍 Profile query result:', { profile: !!profile, error: profileError?.message })
          
          if (!mounted) {
            console.log('⚠️ Component unmounted, aborting user set')
            return
          }
          
          if (profile) {
            console.log('✅ Setting user from profile:', profile.email)
            setUser(profile)
            console.log('🔍 User state after profile set:', profile.id)
          } else {
            console.log('⚠️ No profile found, creating fallback user for:', session.user.email)
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
              role: session.user.user_metadata?.role || 'employee',
              created_at: session.user.created_at
            }
            setUser(fallbackUser)
            console.log('✅ Fallback user set:', fallbackUser.email)
            console.log('🔍 User state after fallback set:', fallbackUser.id)
          }
        } catch (error) {
          console.error('❌ Profile lookup error:', error)
          
          if (!mounted) {
            console.log('⚠️ Component unmounted during error, aborting user set')
            return
          }
          
          // Always set fallback user on error
          const fallbackUser = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
            role: session.user.user_metadata?.role || 'employee',
            created_at: session.user.created_at
          }
          setUser(fallbackUser)
          console.log('✅ Error fallback user set:', fallbackUser.email)
          console.log('🔍 User state after error fallback set:', fallbackUser.id)
        } finally {
          processingSignIn = false
          console.log('🏁 SIGNED_IN processing complete')
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('Processing SIGNED_OUT event')
        setUser(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log('Processing TOKEN_REFRESHED/USER_UPDATED, ensuring loading is false')
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array to run only once

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createSupabaseBrowser()
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
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, role: 'employee' | 'business_owner') => {
    const supabase = createSupabaseBrowser()
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
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }, [])

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎯 useAuth state changed:', { user: user?.email || 'null', loading })
  }, [user, loading])

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}