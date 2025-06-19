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
  const { user } = useAuth()
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

      // Auto-select the first team if no current team is selected
      if (data.teams.length > 0 && !currentTeam) {
        const storedTeamId = localStorage.getItem('currentTeamId')
        const teamToSelect = storedTeamId 
          ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
          : data.teams[0]
        
        setCurrentTeam(teamToSelect)
        localStorage.setItem('currentTeamId', teamToSelect.id)
      }
    } catch (error) {
      console.error('Error fetching user teams:', error)
      // Don't throw here to avoid breaking the app
    } finally {
      setTeamsLoading(false)
    }
  }, [user, currentTeam])

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

  // Fetch teams when user changes
  useEffect(() => {
    if (user) {
      fetchUserTeams()
    } else {
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      localStorage.removeItem('currentTeamId')
    }
  }, [user, fetchUserTeams])

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