import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    let mounted = true
    
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
    
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!mounted) return
          
          if (profile) {
            setUser(profile)
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
              role: session.user.user_metadata?.role || 'employee',
              created_at: session.user.created_at
            })
          }
        } catch (error) {
          console.error('Sign in profile error:', error)
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
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

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}