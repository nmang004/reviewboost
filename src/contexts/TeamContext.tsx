'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { TeamWithUserRole, TeamApiResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

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
  const [currentTeam, setCurrentTeam] = useState<TeamWithUserRole | null>(null)
  const [userTeams, setUserTeams] = useState<TeamWithUserRole[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  
  // Create a stable Supabase client instance
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  // Fetch user teams from API with retry logic
  const fetchUserTeams = useCallback(async (retryCount = 0) => {
    if (!user) {
      console.log('TeamContext: No user provided to fetchUserTeams')
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      return
    }

    const maxRetries = 3
    console.log(`TeamContext: Fetching teams for user ${user.email} (attempt ${retryCount + 1}/${maxRetries + 1})`)

    try {
      setTeamsLoading(true)
      
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
      setUserTeams(data.teams)

      // Auto-select team: prioritize stored team, fallback to first team
      if (data.teams.length > 0) {
        const storedTeamId = localStorage.getItem('currentTeamId')
        const teamToSelect = storedTeamId 
          ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
          : data.teams[0]
        
        console.log(`TeamContext: Selected team: ${teamToSelect.name}`)
        setCurrentTeam(teamToSelect)
        localStorage.setItem('currentTeamId', teamToSelect.id)
      } else {
        console.log('TeamContext: No teams available for user')
        setCurrentTeam(null)
        localStorage.removeItem('currentTeamId')
      }
    } catch (error) {
      console.error(`TeamContext: Team fetch error (attempt ${retryCount + 1}):`, error)
      
      // Retry logic for transient failures
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        console.log(`TeamContext: Retrying in ${retryDelay}ms...`)
        setTimeout(() => {
          fetchUserTeams(retryCount + 1)
        }, retryDelay)
        return // Don't set loading to false yet
      } else {
        console.error('TeamContext: Max retries exceeded, giving up')
      }
    } finally {
      // Only set loading to false if we're not retrying
      if (retryCount >= maxRetries) {
        setTeamsLoading(false)
      }
    }
  }, [user, supabase])

  // Enhanced team fetching with auth state recovery
  useEffect(() => {
    if (!authLoading && user) {
      console.log('TeamContext: User available, fetching teams:', user.email)
      fetchUserTeams()
    } else if (!authLoading && !user) {
      console.log('TeamContext: No user, clearing team state')
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      localStorage.removeItem('currentTeamId')
    } else if (authLoading) {
      console.log('TeamContext: Auth still loading, waiting...')
    }
  }, [user, authLoading, fetchUserTeams])

  // Post-login detection with retry mechanism
  useEffect(() => {
    const handlePostLoginRecovery = async () => {
      // Detect post-login scenario: user just became available and we have no teams
      const isPostLogin = !authLoading && user && userTeams.length === 0 && !teamsLoading
      
      if (isPostLogin) {
        console.log('TeamContext: Post-login recovery triggered - refreshing auth and teams')
        
        try {
          // Force auth session refresh
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            console.log('TeamContext: Session refreshed, retrying team fetch')
            // Small delay to ensure auth state is fully propagated
            setTimeout(() => {
              fetchUserTeams()
            }, 500)
          }
        } catch (error) {
          console.error('TeamContext: Post-login recovery failed:', error)
        }
      }
    }

    handlePostLoginRecovery()
  }, [user, authLoading, userTeams.length, teamsLoading, supabase, fetchUserTeams])

  // Refresh teams data
  const refreshTeams = useCallback(async () => {
    await fetchUserTeams()
  }, [fetchUserTeams])

  // Select a team
  const selectTeam = useCallback((team: TeamWithUserRole) => {
    setCurrentTeam(team)
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
    teamsLoading: authLoading || teamsLoading,
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
    options: RequestInit = {}
  ) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    // Add team_id to URL if it's a team-scoped endpoint and team is selected
    let finalUrl = url
    if (currentTeam && (url.includes('/api/leaderboard') || url.includes('/api/dashboard/stats'))) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}team_id=${currentTeam.id}`
    }

    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    return fetch(finalUrl, {
      ...options,
      headers
    })
  }, [currentTeam, supabase])

  return authenticatedFetch
}