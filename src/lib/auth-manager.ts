import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { User } from '@/types'

export type AuthState = {
  user: User | null
  loading: boolean
}

export type AuthEvent = 'auth-state-changed' | 'sign-in' | 'sign-out'

class AuthManager extends EventTarget {
  private static instance: AuthManager
  private supabase = createSupabaseBrowser()
  private currentState: AuthState = { user: null, loading: true }
  private initialized = false
  private authSubscription: { unsubscribe: () => void } | null = null
  private componentRefs = new WeakSet<object>()
  private eventListeners = new Map<string, Set<EventListener>>()

  private constructor() {
    super()
    this.initializeAuth()
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  private async initializeAuth() {
    console.log('🚀 AuthManager: Initializing singleton auth state')
    
    try {
      // Get initial session
      const { data: { user: authUser } } = await this.supabase.auth.getUser()
      
      if (authUser && authUser.email) {
        console.log('🔍 AuthManager: Found existing user, loading profile:', authUser.email)
        await this.loadUserProfile({
          id: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata,
          created_at: authUser.created_at
        })
      } else {
        console.log('📭 AuthManager: No existing user found')
        this.updateState({ user: null, loading: false })
      }
    } catch (error) {
      console.error('❌ AuthManager: Initialization error:', error)
      this.updateState({ user: null, loading: false })
    }

    // Set up persistent auth state listener
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 AuthManager: Auth state change event:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user && session.user.email) {
        console.log('✅ AuthManager: Processing SIGNED_IN event for:', session.user.email)
        await this.loadUserProfile({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
          created_at: session.user.created_at
        })
        this.dispatchEvent(new CustomEvent('sign-in', { detail: this.currentState.user }))
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 AuthManager: Processing SIGNED_OUT event')
        this.updateState({ user: null, loading: false })
        this.dispatchEvent(new CustomEvent('sign-out'))
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log('🔄 AuthManager: Token refreshed/user updated, ensuring not loading')
        this.updateState({ ...this.currentState, loading: false })
      }
    })

    this.authSubscription = subscription
    this.initialized = true
    console.log('✨ AuthManager: Initialization completed')
  }

  private async loadUserProfile(authUser: { id: string; email: string; user_metadata?: Record<string, unknown>; created_at: string }) {
    console.log('👤 AuthManager: Loading profile for user:', authUser.id)
    
    try {
      const { data: profile } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        console.log('✅ AuthManager: Profile loaded successfully:', profile.email)
        this.updateState({ user: profile, loading: false })
      } else {
        console.log('⚠️ AuthManager: No profile found, creating fallback user')
        const fallbackUser: User = {
          id: authUser.id,
          email: authUser.email!,
          name: (authUser.user_metadata?.name as string) || authUser.email!.split('@')[0],
          role: (authUser.user_metadata?.role as 'employee' | 'business_owner') || 'employee',
          created_at: authUser.created_at
        }
        this.updateState({ user: fallbackUser, loading: false })
        console.log('✅ AuthManager: Fallback user created:', fallbackUser.email)
      }
    } catch (error) {
      console.error('❌ AuthManager: Profile loading error:', error)
      
      // Always create fallback user on error
      const fallbackUser: User = {
        id: authUser.id,
        email: authUser.email!,
        name: (authUser.user_metadata?.name as string) || authUser.email!.split('@')[0],
        role: (authUser.user_metadata?.role as 'employee' | 'business_owner') || 'employee',
        created_at: authUser.created_at
      }
      this.updateState({ user: fallbackUser, loading: false })
      console.log('✅ AuthManager: Error fallback user created:', fallbackUser.email)
    }
  }

  private updateState(newState: AuthState) {
    const oldState = this.currentState
    this.currentState = newState
    
    console.log('🎯 AuthManager: State updated:', { 
      user: newState.user?.email || 'null', 
      loading: newState.loading 
    })
    
    // Only dispatch if state actually changed
    if (oldState.user?.id !== newState.user?.id || oldState.loading !== newState.loading) {
      this.dispatchEvent(new CustomEvent('auth-state-changed', { detail: newState }))
    }
  }

  // Override addEventListener to track listeners properly
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
    if (!listener) return
    
    super.addEventListener(type, listener, options)
    
    const listenerFn = typeof listener === 'function' ? listener : listener.handleEvent
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listenerFn)
    
    console.log(`🔗 AuthManager: Added event listener for ${type}. Total for ${type}: ${this.eventListeners.get(type)!.size}`)
  }

  // Override removeEventListener to properly clean up tracking
  removeEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | EventListenerOptions): void {
    if (!listener) return
    
    super.removeEventListener(type, listener, options)
    
    const listenerFn = typeof listener === 'function' ? listener : listener.handleEvent
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listenerFn)
      console.log(`🔌 AuthManager: Removed event listener for ${type}. Remaining for ${type}: ${listeners.size}`)
      
      if (listeners.size === 0) {
        this.eventListeners.delete(type)
      }
    }
  }

  // Subscribe with automatic cleanup tracking
  subscribe(component: object, eventType: AuthEvent, callback: EventListener): () => void {
    this.componentRefs.add(component)
    this.addEventListener(eventType, callback)
    
    return () => {
      this.removeEventListener(eventType, callback)
    }
  }

  // Public methods
  getState(): AuthState {
    return { ...this.currentState }
  }

  async signIn(email: string, password: string) {
    console.log('🔐 AuthManager: Sign in attempt for:', email)
    
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('❌ AuthManager: Sign in error:', error)
      throw error
    }
    
    console.log('✅ AuthManager: Sign in successful, auth state change will be handled by listener')
    return { data, error }
  }

  async signUp(email: string, password: string, name: string, role: 'employee' | 'business_owner') {
    console.log('📝 AuthManager: Sign up attempt for:', email)
    
    const redirectUrl = `${window.location.origin}/auth/callback`
    
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      console.error('❌ AuthManager: Sign up error:', error)
      throw error
    }
    
    // Check if user needs email confirmation
    if (data.user && !data.user.email_confirmed_at) {
      return { data, error, needsEmailConfirmation: true }
    }
    
    // If user is immediately confirmed, create profile
    if (data.user && data.user.email_confirmed_at) {
      const { error: profileError } = await this.supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name,
          role,
        })
      
      if (profileError) {
        console.error('❌ AuthManager: Error creating user profile:', profileError)
      }
    }
    
    return { data, error }
  }

  async signOut() {
    console.log('👋 AuthManager: Sign out initiated')
    
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      console.error('❌ AuthManager: Sign out error:', error)
      throw error
    }
    
    // State will be updated by the auth state change listener
    console.log('✅ AuthManager: Sign out successful')
  }

  // Enhanced cleanup method
  destroy() {
    console.log('🧹 AuthManager: Starting cleanup process')
    
    // Clean up Supabase auth subscription
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
      this.authSubscription = null
      console.log('🧹 AuthManager: Supabase subscription cleaned up')
    }
    
    // Remove all event listeners
    for (const [eventType, listeners] of this.eventListeners) {
      for (const listener of listeners) {
        super.removeEventListener(eventType, listener)
      }
      console.log(`🧹 AuthManager: Removed ${listeners.size} listeners for ${eventType}`)
    }
    this.eventListeners.clear()
    
    // Clear component references
    this.componentRefs = new WeakSet<object>()
    
    // Reset state
    this.currentState = { user: null, loading: true }
    this.initialized = false
    
    console.log('🧹 AuthManager: Cleanup completed')
  }

  // Reset singleton instance (for testing or full app reset)
  static resetInstance() {
    if (AuthManager.instance) {
      AuthManager.instance.destroy()
      AuthManager.instance = undefined as unknown as AuthManager
      console.log('🔄 AuthManager: Instance reset')
    }
  }

  // Check for potential memory leaks (development helper)
  getMemoryInfo() {
    const listenerCount = Array.from(this.eventListeners.values())
      .reduce((total, listeners) => total + listeners.size, 0)
    
    return {
      totalEventListeners: listenerCount,
      eventTypes: Array.from(this.eventListeners.keys()),
      hasActiveSubscription: !!this.authSubscription,
      isInitialized: this.initialized
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance()