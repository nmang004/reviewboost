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
    console.log('🔄 fetchUserTeams called, user:', user?.email)
    
    if (!user) {
      console.log('❌ No user, clearing teams')
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      return
    }

    try {
      setTeamsLoading(true)
      console.log('⏳ Starting team fetch process...')
      
      // Wait for auth session to be fully established with retry logic
      let session = null
      let retries = 0
      const maxRetries = 10
      
      console.log('🔑 Waiting for auth session...')
      while (!session?.access_token && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Increased to 500ms
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        session = currentSession
        retries++
        console.log(`🔑 Session attempt ${retries}: ${session?.access_token ? 'SUCCESS' : 'NO TOKEN'}`)
      }
      
      if (!session?.access_token) {
        console.error('❌ No authentication token available after retries')
        throw new Error('No authentication token available after retries')
      }
      
      console.log('✅ Session established, making API call...')

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 API Response status:', response.status)

      if (!response.ok) {
        console.error('❌ API call failed:', response.statusText)
        throw new Error(`Failed to fetch teams: ${response.statusText}`)
      }

      const data: TeamApiResponse = await response.json()
      console.log('📊 Teams received:', data.teams?.length || 0, 'teams')
      console.log('📊 Teams data:', data.teams)
      
      setUserTeams(data.teams)

      // Auto-select team: prioritize stored team, fallback to first team
      if (data.teams.length > 0) {
        const storedTeamId = localStorage.getItem('currentTeamId')
        console.log('💾 Stored team ID:', storedTeamId)
        
        const teamToSelect = storedTeamId 
          ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
          : data.teams[0]
        
        console.log('🎯 Selected team:', teamToSelect.name)
        setCurrentTeam(teamToSelect)
        localStorage.setItem('currentTeamId', teamToSelect.id)
      } else {
        console.log('❌ No teams available, clearing current team')
        // Clear current team if no teams available
        setCurrentTeam(null)
        localStorage.removeItem('currentTeamId')
      }
      
      console.log('✅ Team fetch completed successfully')
    } catch (error) {
      console.error('❌ Error fetching user teams:', error)
      // Don't throw here to avoid breaking the app
    } finally {
      setTeamsLoading(false)
      console.log('🏁 Teams loading finished')
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
    console.log('🔄 TeamContext useEffect triggered:', { 
      authLoading, 
      user: user?.email, 
      userExists: !!user 
    })
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      // Still loading auth, keep teams loading state
      return
    }
    
    if (user) {
      console.log('👤 User authenticated, scheduling team fetch in 1 second...')
      // Add additional delay on initial load to ensure everything is ready
      const timer = setTimeout(() => {
        console.log('⏰ Timer triggered, calling fetchUserTeams')
        fetchUserTeams()
      }, 1000) // 1 second delay for initial load
      
      return () => {
        console.log('🧹 Cleaning up timer')
        clearTimeout(timer)
      }
    } else {
      console.log('❌ No user, clearing teams')
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