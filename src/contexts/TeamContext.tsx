'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { TeamWithUserRole, TeamApiResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

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

  // Fetch user teams from API
  const fetchUserTeams = useCallback(async () => {
    if (!user) {
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      return
    }

    try {
      setTeamsLoading(true)
      
      // Small delay to ensure auth session is fully established
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Get the auth token for API calls
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.statusText}`)
      }

      const data: TeamApiResponse = await response.json()
      setUserTeams(data.teams)

      // Auto-select team: prioritize stored team, fallback to first team
      if (data.teams.length > 0) {
        const storedTeamId = localStorage.getItem('currentTeamId')
        const teamToSelect = storedTeamId 
          ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
          : data.teams[0]
        
        setCurrentTeam(teamToSelect)
        localStorage.setItem('currentTeamId', teamToSelect.id)
      } else {
        // Clear current team if no teams available
        setCurrentTeam(null)
        localStorage.removeItem('currentTeamId')
      }
    } catch (error) {
      console.error('Error fetching user teams:', error)
      // Don't throw here to avoid breaking the app
    } finally {
      setTeamsLoading(false)
    }
  }, [user])

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

  // Fetch teams when user changes and auth is not loading
  useEffect(() => {
    if (authLoading) {
      // Still loading auth, keep teams loading state
      return
    }
    
    if (user) {
      fetchUserTeams()
    } else {
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      localStorage.removeItem('currentTeamId')
    }
  }, [user, authLoading, fetchUserTeams])

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
  }, [currentTeam])

  return authenticatedFetch
}