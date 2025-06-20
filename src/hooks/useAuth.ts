import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkingUser = useRef(false)

  useEffect(() => {
    checkUser()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email)
      checkUser()
    })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    // Prevent multiple simultaneous calls
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
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        console.log('📊 Profile query result:', profileError ? 'Error' : 'Success')
        
        if (profileError) {
          console.error('❌ Profile query error:', profileError.message)
          setUser(null)
        } else if (profile) {
          console.log('✅ Setting user profile:', profile.email)
          setUser(profile)
        } else {
          console.log('⚠️ No profile found, setting user to null')
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
      console.log('🔄 Setting loading to false')
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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    console.log('🔐 Supabase auth signup response:', { data, error })
    
    if (error) {
      console.error('❌ Supabase auth signup error:', error)
      throw error
    }
    
    // Create user profile in database
    if (data.user) {
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
        throw profileError
      }
      
      if (profile) {
        console.log('✅ Setting user profile:', profile)
        setUser(profile)
        return { data, error, userProfile: profile as User }
      }
    } else {
      console.log('⚠️ No user in signup response')
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