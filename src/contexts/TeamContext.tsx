'use client'

import React, { createContext, useContext, useEffect, useCallback, useMemo, useReducer } from 'react'
import { TeamWithUserRole, TeamApiResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { RETRY_CONFIG, SESSION_CONFIG } from '@/lib/constants'

// State machine types for team management
type TeamState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error', error: string }
  | { status: 'success', teams: TeamWithUserRole[], currentTeam?: TeamWithUserRole }
  | { status: 'no-user' }
  | { status: 'post-login-recovery' }

type TeamAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS', teams: TeamWithUserRole[], currentTeam?: TeamWithUserRole }
  | { type: 'FETCH_ERROR', error: string }
  | { type: 'USER_CLEARED' }
  | { type: 'SET_CURRENT_TEAM', team: TeamWithUserRole }
  | { type: 'TRIGGER_POST_LOGIN_RECOVERY' }
  | { type: 'RESET' }

function teamStateReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' }
    
    case 'FETCH_SUCCESS':
      return { 
        status: 'success', 
        teams: action.teams,
        currentTeam: action.currentTeam 
      }
    
    case 'FETCH_ERROR':
      return { status: 'error', error: action.error }
    
    case 'USER_CLEARED':
      return { status: 'no-user' }
    
    case 'SET_CURRENT_TEAM':
      if (state.status === 'success') {
        return { 
          ...state, 
          currentTeam: action.team 
        }
      }
      return state
    
    case 'TRIGGER_POST_LOGIN_RECOVERY':
      return { status: 'post-login-recovery' }
    
    case 'RESET':
      return { status: 'idle' }
    
    default:
      return state
  }
}

interface TeamContextType {
  // Current team state
  currentTeam: TeamWithUserRole | null
  userTeams: TeamWithUserRole[]
  
  // Loading states
  teamsLoading: boolean
  
  // Actions
  selectTeam: (team: TeamWithUserRole) => void
  refreshTeams: () => Promise<void>
  
  // Helper functions
  isTeamAdmin: (teamId?: string) => boolean
  canManageTeam: (teamId?: string) => boolean
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [teamState, dispatch] = useReducer(teamStateReducer, { status: 'idle' })
  
  // Derived state from the reducer using useMemo to prevent unnecessary re-renders
  const currentTeam = useMemo(() => 
    teamState.status === 'success' ? teamState.currentTeam || null : null, 
    [teamState]
  )
  const userTeams = useMemo(() => 
    teamState.status === 'success' ? teamState.teams : [], 
    [teamState]
  )
  const teamsLoading = useMemo(() => 
    teamState.status === 'loading' || teamState.status === 'post-login-recovery', 
    [teamState.status]
  )
  
  // Create a stable Supabase client instance
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  // Cache configuration
  const CACHE_KEY = 'teamContextCache'
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  // Check if cached data is still valid
  const getCachedTeams = useCallback((userId: string) => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${userId}`)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const isExpired = Date.now() - timestamp > CACHE_DURATION
        if (!isExpired) {
          console.log('TeamContext: Using cached teams data')
          return data
        } else {
          console.log('TeamContext: Cached teams data expired')
          localStorage.removeItem(`${CACHE_KEY}_${userId}`)
        }
      }
    } catch (error) {
      console.error('TeamContext: Error reading cached data:', error)
      localStorage.removeItem(`${CACHE_KEY}_${userId}`)
    }
    return null
  }, [CACHE_KEY, CACHE_DURATION])

  // Cache teams data
  const setCachedTeams = useCallback((userId: string, teams: TeamWithUserRole[]) => {
    try {
      const cacheData = {
        data: teams,
        timestamp: Date.now()
      }
      localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(cacheData))
      console.log('TeamContext: Teams data cached successfully')
    } catch (error) {
      console.error('TeamContext: Error caching teams data:', error)
    }
  }, [CACHE_KEY])

  // Fetch user teams from API with retry logic
  const fetchUserTeams = useCallback(async (retryCount = 0, forceRefresh = false) => {
    if (!user) {
      console.log('TeamContext: No user provided to fetchUserTeams')
      dispatch({ type: 'USER_CLEARED' })
      return
    }

    // Check cache first unless forcing refresh
    if (!forceRefresh && retryCount === 0) {
      const cachedTeams = getCachedTeams(user.id)
      if (cachedTeams) {
        // Auto-select team: prioritize stored team, fallback to first team
        let selectedTeam: TeamWithUserRole | undefined
        if (cachedTeams.length > 0) {
          const storedTeamId = localStorage.getItem('currentTeamId')
          selectedTeam = storedTeamId 
            ? cachedTeams.find((team: TeamWithUserRole) => team.id === storedTeamId) || cachedTeams[0]
            : cachedTeams[0]
          
          if (selectedTeam) {
            console.log(`TeamContext: Selected cached team: ${selectedTeam.name}`)
            localStorage.setItem('currentTeamId', selectedTeam.id)
          }
        } else {
          localStorage.removeItem('currentTeamId')
        }
        
        dispatch({ 
          type: 'FETCH_SUCCESS', 
          teams: cachedTeams, 
          currentTeam: selectedTeam 
        })
        return
      }
    }

    const maxRetries = RETRY_CONFIG.MAX_RETRIES
    console.log(`TeamContext: Fetching teams for user ${user.email} (attempt ${retryCount + 1}/${maxRetries + 1})`)

    try {
      dispatch({ type: 'FETCH_START' })
      
      // Get current session with retry
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`)
      }
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      console.log('TeamContext: Valid session found, making API request')

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch teams (${response.status}): ${errorText}`)
      }

      const data: TeamApiResponse = await response.json()
      console.log(`TeamContext: Successfully fetched ${data.teams.length} teams`)

      // Cache the teams data
      setCachedTeams(user.id, data.teams)

      // Auto-select team: prioritize stored team, fallback to first team
      let selectedTeam: TeamWithUserRole | undefined
      if (data.teams.length > 0) {
        const storedTeamId = localStorage.getItem('currentTeamId')
        selectedTeam = storedTeamId 
          ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
          : data.teams[0]
        
        if (selectedTeam) {
          console.log(`TeamContext: Selected team: ${selectedTeam.name}`)
          localStorage.setItem('currentTeamId', selectedTeam.id)
        }
      } else {
        console.log('TeamContext: No teams available for user')
        localStorage.removeItem('currentTeamId')
      }
      
      // Success - dispatch success action
      console.log('TeamContext: Team fetch completed successfully')
      dispatch({ 
        type: 'FETCH_SUCCESS', 
        teams: data.teams, 
        currentTeam: selectedTeam 
      })
    } catch (error) {
      console.error(`TeamContext: Team fetch error (attempt ${retryCount + 1}):`, error)
      
      // Retry logic for transient failures
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount) * RETRY_CONFIG.INITIAL_DELAY_MS
        console.log(`TeamContext: Retrying in ${retryDelay}ms...`)
        setTimeout(() => {
          fetchUserTeams(retryCount + 1)
        }, retryDelay)
        return // Don't dispatch error yet, retrying
      } else {
        console.error('TeamContext: Max retries exceeded, giving up')
        dispatch({ 
          type: 'FETCH_ERROR', 
          error: error instanceof Error ? error.message : 'Failed to fetch teams' 
        })
      }
    }
  }, [user, supabase, getCachedTeams, setCachedTeams])

  // Single useEffect with clear state transitions to prevent circular updates
  useEffect(() => {
    let cancelled = false
    
    async function handleStateTransition() {
      if (cancelled) return
      
      // Handle different auth/team states
      if (authLoading) {
        console.log('TeamContext: Auth still loading, waiting...')
        return
      }
      
      if (!user) {
        console.log('TeamContext: No user, clearing team state')
        dispatch({ type: 'USER_CLEARED' })
        localStorage.removeItem('currentTeamId')
        
        // Clear all team cache entries
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(CACHE_KEY)) {
            localStorage.removeItem(key)
          }
        })
        return
      }
      
      // User is available - check what we need to do
      if (teamState.status === 'idle' || teamState.status === 'no-user') {
        console.log('TeamContext: User available, fetching teams:', user.email)
        fetchUserTeams()
      } else if (teamState.status === 'success' && userTeams.length === 0) {
        // Post-login recovery scenario: user exists but no teams loaded
        console.log('TeamContext: Post-login recovery triggered - refreshing auth and teams')
        dispatch({ type: 'TRIGGER_POST_LOGIN_RECOVERY' })
        
        try {
          // Force auth session refresh
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && !cancelled) {
            console.log('TeamContext: Session refreshed, retrying team fetch')
            // Small delay to ensure auth state is fully propagated
            setTimeout(() => {
              if (!cancelled) {
                fetchUserTeams(0, true) // Force refresh
              }
            }, SESSION_CONFIG.SESSION_REFRESH_DELAY_MS)
          }
        } catch (error) {
          console.error('TeamContext: Post-login recovery failed:', error)
          if (!cancelled) {
            dispatch({ type: 'FETCH_ERROR', error: 'Post-login recovery failed' })
          }
        }
      }
    }
    
    handleStateTransition()
    
    return () => {
      cancelled = true
    }
  }, [user, authLoading, teamState.status, userTeams.length, fetchUserTeams, supabase, CACHE_KEY])

  // Refresh teams data
  const refreshTeams = useCallback(async () => {
    if (user) {
      // Clear cache to force fresh data
      localStorage.removeItem(`${CACHE_KEY}_${user.id}`)
    }
    await fetchUserTeams(0, true) // Force refresh
  }, [fetchUserTeams, user, CACHE_KEY])

  // Select a team
  const selectTeam = useCallback((team: TeamWithUserRole) => {
    dispatch({ type: 'SET_CURRENT_TEAM', team })
    localStorage.setItem('currentTeamId', team.id)
  }, [])

  // Check if user is admin of current team (or specified team)
  const isTeamAdmin = useCallback((teamId?: string) => {
    const targetTeamId = teamId || currentTeam?.id
    if (!targetTeamId) return false
    
    const team = userTeams.find(t => t.id === targetTeamId)
    return team?.user_role === 'admin'
  }, [currentTeam, userTeams])

  // Check if user can manage the team (admin permissions)
  const canManageTeam = useCallback((teamId?: string) => {
    return isTeamAdmin(teamId)
  }, [isTeamAdmin])

  const value: TeamContextType = {
    currentTeam,
    userTeams,
    teamsLoading,
    selectTeam,
    refreshTeams,
    isTeamAdmin,
    canManageTeam
  }

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
}

// Hook for making authenticated API calls with team context
export function useAuthenticatedFetch() {
  const { currentTeam } = useTeam()
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const authenticatedFetch = useCallback(async (
    url: string, 
    options: RequestInit = {},
    retryCount = 0
  ) => {
    const maxRetries = SESSION_CONFIG.MAX_AUTH_RETRIES
    
    try {
      // Get fresh session, refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        // Try to refresh session once
        if (retryCount === 0) {
          console.log('Session invalid, attempting refresh...')
          await supabase.auth.refreshSession()
          return authenticatedFetch(url, options, 1)
        }
        throw new Error('Authentication session invalid or expired')
      }

      // Add team_id to URL if it's a team-scoped endpoint and team is selected
      let finalUrl = url
      if (currentTeam && (url.includes('/api/leaderboard') || url.includes('/api/dashboard/stats'))) {
        const separator = url.includes('?') ? '&' : '?'
        finalUrl = `${url}${separator}team_id=${currentTeam.id}`
        console.log('🔗 AuthenticatedFetch: Added team_id to URL:', finalUrl)
      } else if (url.includes('/api/leaderboard') || url.includes('/api/dashboard/stats')) {
        console.log('⚠️ AuthenticatedFetch: Team-scoped endpoint called without currentTeam:', url)
      }

      const headers = {
        [SESSION_CONFIG.AUTH_TOKEN_HEADER]: `Bearer ${session.access_token}`,
        [SESSION_CONFIG.JWT_TOKEN_HEADER]: session.access_token, // Add explicit JWT token header for API validation
        'Content-Type': 'application/json',
        ...options.headers
      }
      
      console.log('📡 AuthenticatedFetch: Making request to:', finalUrl)
      console.log('🔐 AuthenticatedFetch: Auth header length:', headers.Authorization.length)
      console.log('👤 AuthenticatedFetch: Current team:', currentTeam?.name || 'none')

      const response = await fetch(finalUrl, {
        ...options,
        headers
      })
      
      console.log('📬 AuthenticatedFetch: Response status:', response.status, response.statusText)
      
      // Log error responses for debugging
      if (!response.ok) {
        try {
          const errorText = await response.clone().text()
          console.log('❌ AuthenticatedFetch: Error response:', errorText)
        } catch {
          console.log('❌ AuthenticatedFetch: Could not read error response')
        }
      }

      // Handle auth errors with retry
      if (response.status === 401 && retryCount < maxRetries) {
        console.log('Auth error, refreshing session and retrying...')
        await supabase.auth.refreshSession()
        return authenticatedFetch(url, options, retryCount + 1)
      }

      return response
    } catch (error) {
      console.error(`Authenticated fetch failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error)
      
      // Retry on network errors, but not on auth errors after max retries
      if (retryCount < maxRetries && error instanceof Error && error.message.includes('fetch')) {
        console.log('Network error, retrying...')
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.INITIAL_DELAY_MS * (retryCount + 1)))
        return authenticatedFetch(url, options, retryCount + 1)
      }
      
      throw error
    }
  }, [currentTeam, supabase])

  return authenticatedFetch
}