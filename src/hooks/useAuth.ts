import { useState, useEffect, useCallback } from 'react'
import { authManager, AuthState } from '@/lib/auth-manager'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => authManager.getState())
  
  useEffect(() => {
    console.log('🔗 useAuth: Subscribing to auth manager events')
    
    // Get current state
    setAuthState(authManager.getState())
    
    // Listen for auth state changes
    const handleAuthChange = (event: CustomEvent<AuthState>) => {
      console.log('📨 useAuth: Received auth state change:', {
        user: event.detail.user?.email || 'null',
        loading: event.detail.loading
      })
      setAuthState(event.detail)
    }
    
    // Listen for specific sign in/out events if needed
    const handleSignIn = (event: CustomEvent) => {
      console.log('📨 useAuth: Received sign-in event for user:', event.detail?.email)
    }
    
    const handleSignOut = () => {
      console.log('📨 useAuth: Received sign-out event')
    }
    
    // Add event listeners
    authManager.addEventListener('auth-state-changed', handleAuthChange as EventListener)
    authManager.addEventListener('sign-in', handleSignIn as EventListener)
    authManager.addEventListener('sign-out', handleSignOut as EventListener)
    
    // Cleanup
    return () => {
      console.log('🔌 useAuth: Unsubscribing from auth manager events')
      authManager.removeEventListener('auth-state-changed', handleAuthChange as EventListener)
      authManager.removeEventListener('sign-in', handleSignIn as EventListener)
      authManager.removeEventListener('sign-out', handleSignOut as EventListener)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    return await authManager.signIn(email, password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, role: 'employee' | 'business_owner') => {
    return await authManager.signUp(email, password, name, role)
  }, [])

  const signOut = useCallback(async () => {
    await authManager.signOut()
  }, [])

  return {
    user: authState.user,
    loading: authState.loading,
    signIn,
    signUp,
    signOut,
  }
}