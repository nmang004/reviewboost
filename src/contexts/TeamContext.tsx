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
  const [mounted, setMounted] = useState(false)

  // Track component mounting
  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    console.log('🎯 TeamProvider mounted on path:', currentPath)
    setMounted(true)
    return () => console.log('💀 TeamProvider unmounting')
  }, [])

  // Detect and handle post-login redirects
  useEffect(() => {
    if (!mounted) return
    
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isPostLoginPage = ['/dashboard', '/submit-review'].includes(currentPath)
    
    // If we're on a post-login page and auth is complete but no teams loaded
    if (isPostLoginPage && !authLoading && user && userTeams.length === 0) {
      console.log('🚀 Post-login redirect detected, forcing immediate team fetch')
      
      // Force immediate team fetch for post-login scenarios
      const immediateTimer = setTimeout(() => {
        console.log('🚀 Immediate timer triggered for post-login')
        fetchUserTeams()
      }, 500) // Short delay to ensure session is ready
      
      return () => clearTimeout(immediateTimer)
    }
  }, [mounted, authLoading, user, userTeams.length, fetchUserTeams]) // Added fetchUserTeams

  // Fetch user teams from API with retry logic
  const fetchUserTeams = useCallback(async () => {
    if (!user) {
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      return
    }

    const attemptFetch = async (attempt: number): Promise<boolean> => {
      try {
        console.log(`🔄 Team fetch attempt ${attempt}`)
        setTeamsLoading(true)
        
        // Wait for auth session to be fully established with retry logic
        let session = null
        let retries = 0
        const maxRetries = 10
        
        while (!session?.access_token && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          session = currentSession
          retries++
        }
        
        if (!session?.access_token) {
          console.error('❌ No authentication token available after retries')
          throw new Error('No authentication token available after retries')
        }

        const response = await fetch('/api/teams', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.error('❌ API response failed:', response.status, response.statusText)
          throw new Error(`Failed to fetch teams: ${response.statusText}`)
        }

        const data: TeamApiResponse = await response.json()
        console.log('✅ Teams loaded successfully:', data.teams.length)
        setUserTeams(data.teams)

        // Auto-select team: prioritize stored team, fallback to first team
        if (data.teams.length > 0) {
          const storedTeamId = localStorage.getItem('currentTeamId')
          const teamToSelect = storedTeamId 
            ? data.teams.find(team => team.id === storedTeamId) || data.teams[0]
            : data.teams[0]
          
          setCurrentTeam(teamToSelect)
          localStorage.setItem('currentTeamId', teamToSelect.id)
          console.log('✅ Team selected:', teamToSelect.name)
        } else {
          // Clear current team if no teams available
          setCurrentTeam(null)
          localStorage.removeItem('currentTeamId')
          console.log('⚠️ No teams available')
        }
        
        return true
      } catch (error) {
        console.error(`❌ Team fetch attempt ${attempt} failed:`, error)
        return false
      } finally {
        setTeamsLoading(false)
      }
    }

    // Try up to 3 times with delays
    for (let attempt = 1; attempt <= 3; attempt++) {
      const success = await attemptFetch(attempt)
      if (success) return
      
      // Wait before retry (except on last attempt)
      if (attempt < 3) {
        console.log(`⏳ Retrying in 2 seconds... (attempt ${attempt + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.error('❌ All team fetch attempts failed')
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

  // Fetch teams when user and auth state are ready
  useEffect(() => {
    console.log('🔄 TeamContext useEffect triggered:', {
      authLoading,
      user: user?.email,
      userExists: !!user,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'server'
    })
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }
    
    if (user) {
      console.log('👤 User found, scheduling team fetch in 3 seconds...')
      // Longer delay for post-redirect scenarios
      // The redirect resets React state, so we need more time for session restoration
      const timer = setTimeout(() => {
        console.log('⏰ Timer fired, calling fetchUserTeams')
        fetchUserTeams()
      }, 3000) // Increased to 3 seconds to match what works on refresh
      
      return () => {
        console.log('🧹 Cleaning up timer')
        clearTimeout(timer)
      }
    } else {
      console.log('❌ No user found, clearing teams')
      setUserTeams([])
      setCurrentTeam(null)
      setTeamsLoading(false)
      localStorage.removeItem('currentTeamId')
    }
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Additional effect to handle cases where the main effect doesn't trigger
  useEffect(() => {
    if (mounted && !authLoading && user && userTeams.length === 0) {
      console.log('🔄 Backup effect: User exists but no teams loaded, trying backup fetch')
      const backupTimer = setTimeout(() => {
        console.log('🔄 Backup timer triggered, calling fetchUserTeams')
        fetchUserTeams()
      }, 1000) // Shorter delay for backup attempt
      
      return () => clearTimeout(backupTimer)
    }
  }, [mounted, authLoading, user, userTeams.length, fetchUserTeams])

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