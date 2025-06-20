import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkingUser = useRef(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Debounced checkUser to prevent rapid successive calls
  const debouncedCheckUser = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      checkUser()
    }, 100) // 100ms debounce
  }, [])

  useEffect(() => {
    checkUser()
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email)
      
      // Only respond to relevant events and use debouncing
      if (event === 'SIGNED_IN') {
        console.log('👤 User signed in via email confirmation')
        debouncedCheckUser()
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed, updating user')
        debouncedCheckUser()
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out')
        setUser(null)
        setLoading(false)
      }
      // Ignore other events like INITIAL_SESSION to prevent unnecessary calls
    })

    return () => {
      listener?.subscription.unsubscribe()
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [debouncedCheckUser])

  async function checkUser() {
    // Prevent multiple simultaneous calls with stronger guard
    if (checkingUser.current) {
      console.log('🔍 checkUser already in progress, skipping...')
      return
    }

    checkingUser.current = true
    console.log('🔍 checkUser called')
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log('🔐 Auth user from getUser():', authUser?.email || 'none')
      
      if (authUser) {
        console.log('👤 Found auth user, fetching profile...')
        
        // First try normal profile query
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        console.log('📊 Profile query result:', profileError ? `Error: ${profileError.message}` : 'Success')
        
        // If RLS policy prevents access, try with service role context
        if (profileError && profileError.message?.includes('row-level security')) {
          console.log('🔒 RLS blocking access, trying alternative method...')
          
          // Try creating a basic user profile from auth data
          const fallbackProfile: User = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
            role: authUser.user_metadata?.role || 'employee',
            created_at: authUser.created_at
          }
          
          console.log('🔄 Using fallback profile from auth metadata')
          setUser(fallbackProfile)
        } else if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Profile query error:', profileError.message)
          
          // For other errors, still try to create a minimal user from auth data
          if (authUser.email) {
            const fallbackProfile: User = {
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.name || authUser.email.split('@')[0],
              role: authUser.user_metadata?.role || 'employee',
              created_at: authUser.created_at
            }
            console.log('⚠️ Using fallback profile due to error')
            setUser(fallbackProfile)
          } else {
            setUser(null)
          }
        } else if (profile) {
          console.log('✅ Setting user profile:', profile.email)
          setUser(profile)
        } else {
          console.log('⚠️ No profile found - user may need profile creation from trigger')
          setUser(null)
        }
      } else {
        console.log('❌ No auth user found, setting user to null')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Error checking user:', error)
      setUser(null)
    } finally {
      console.log('🔄 Setting loading to false and releasing lock')
      setLoading(false)
      checkingUser.current = false
    }
  }

  async function signIn(email: string, password: string) {
    console.log('🔑 useAuth.signIn called with:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    console.log('🔐 Supabase auth response:', { data, error })
    
    if (error) {
      console.error('❌ Supabase auth error:', error)
      throw error
    }
    
    // Get user profile with role information
    if (data.user) {
      console.log('👤 Fetching user profile for ID:', data.user.id)
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()
      
      console.log('📊 Profile query result:', { profile, profileError })
      
      if (profile) {
        console.log('✅ Setting user profile:', profile)
        setUser(profile)
        return { data, error, userProfile: profile as User }
      } else {
        console.log('⚠️ No profile found in database')
      }
    } else {
      console.log('⚠️ No user in auth response')
    }
    
    return { data, error, userProfile: undefined }
  }

  async function signUp(email: string, password: string, name: string, role: 'employee' | 'business_owner') {
    console.log('📝 useAuth.signUp called with:', { email, name, role })
    
    const redirectUrl = `${window.location.origin}/auth/callback`
    console.log('🔗 Email redirect URL:', redirectUrl)
    
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
    
    console.log('🔐 Supabase auth signup response:', { 
      user: data.user ? { 
        id: data.user.id, 
        email: data.user.email, 
        email_confirmed_at: data.user.email_confirmed_at,
        confirmation_sent_at: data.user.confirmation_sent_at 
      } : null, 
      session: data.session ? 'session exists' : 'no session',
      error 
    })
    
    if (error) {
      console.error('❌ Supabase auth signup error:', error)
      throw error
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.user.email_confirmed_at) {
      console.log('📧 User needs email confirmation, profile will be created after confirmation')
      console.log('📧 Confirmation sent at:', data.user.confirmation_sent_at)
      
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
      console.log('👤 Creating user profile for ID:', data.user.id)
      
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
      
      console.log('📊 Profile creation result:', { profile, profileError })
      
      if (profileError) {
        console.error('❌ Error creating user profile:', profileError)
        // Don't throw error here - the user is created, profile creation can be retried
        return { data, error, userProfile: undefined, profileError }
      }
      
      if (profile) {
        console.log('✅ Setting user profile:', profile)
        setUser(profile)
        return { data, error, userProfile: profile as User }
      }
    }
    
    return { data, error, userProfile: undefined }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}