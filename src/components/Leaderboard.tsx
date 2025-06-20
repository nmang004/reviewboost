import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal, Award } from 'lucide-react'
import { LeaderboardEntry } from '@/types'
import { useTeam, useAuthenticatedFetch } from '@/contexts/TeamContext'

export function Leaderboard() {
  const { currentTeam } = useTeam()
  const authenticatedFetch = useAuthenticatedFetch()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    if (!currentTeam) return

    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/leaderboard')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch leaderboard')
      }
      
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }, [currentTeam, authenticatedFetch])

  useEffect(() => {
    if (currentTeam) {
      fetchLeaderboard()
    } else {
      setLeaderboard([])
      setLoading(false)
    }
  }, [currentTeam, fetchLeaderboard])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />
      default:
        return <span className="text-gray-500 font-medium">{rank}</span>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Leaderboard</CardTitle>
          <CardDescription>Loading team performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="w-8 flex justify-center">
                    <Skeleton className="w-5 h-5 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Leaderboard</CardTitle>
        <CardDescription>
          {currentTeam 
            ? `Top performing members in ${currentTeam.name}` 
            : 'Select a team to view leaderboard'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map((entry) => (
            <div
              key={entry.employee_id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                entry.rank <= 3 ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 flex justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                <div>
                  <p className="font-medium">{entry.employee_name}</p>
                  <p className="text-sm text-gray-500">{entry.employee_email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{entry.total_points} points</p>
                <p className="text-sm text-gray-500">{entry.total_reviews} reviews</p>
              </div>
            </div>
          ))}
          
          {leaderboard.length === 0 && !loading && (
            <p className="text-center text-gray-500 py-8">
              {currentTeam 
                ? 'No reviews submitted yet. Be the first to earn points!' 
                : 'Select a team to view leaderboard'
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}