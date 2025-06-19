import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, Award } from 'lucide-react'
import { LeaderboardEntry } from '@/types'

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard')
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top performing employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Top performing employees based on reviews and points</CardDescription>
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
          
          {leaderboard.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No reviews submitted yet. Be the first to earn points!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}