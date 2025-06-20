import { useState, useEffect, useCallback } from 'react'
import { useTeam, useAuthenticatedFetch } from '@/contexts/TeamContext'

interface DashboardStats {
  totalReviews: number
  totalPoints: number
  totalMembers: number
  topEmployee: {
    name: string
    reviews: number
    points: number
  } | null
  recentReviews: Array<{
    id: string
    customer_name: string
    employee_name: string
    job_type: string
    created_at: string
  }>
  recentReviewsCount: number
  team_id: string
}

const initialStats: DashboardStats = {
  totalReviews: 0,
  totalPoints: 0,
  totalMembers: 0,
  topEmployee: null,
  recentReviews: [],
  recentReviewsCount: 0,
  team_id: '',
}

export function useDashboardStats() {
  const { currentTeam } = useTeam()
  const authenticatedFetch = useAuthenticatedFetch()
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!currentTeam) {
      setStats(initialStats)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await authenticatedFetch('/api/dashboard/stats')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [currentTeam, authenticatedFetch])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { 
    stats, 
    loading, 
    error,
    refetch: fetchStats 
  }
}