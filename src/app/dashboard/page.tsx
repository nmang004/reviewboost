'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Leaderboard } from '@/components/Leaderboard'
import { useAuth } from '@/hooks/useAuth'
import { BarChart3, Trophy, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalReviews: number
  totalPoints: number
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
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalReviews: 0,
    totalPoints: 0,
    topEmployee: null,
    recentReviews: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'business_owner') {
      router.push('/submit-review')
      return
    }

    fetchDashboardStats()
  }, [user, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ReviewBoost Dashboard</h1>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
              <p className="text-xs text-muted-foreground">
                All-time customer reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPoints}</div>
              <p className="text-xs text-muted-foreground">
                Points earned by all employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Employee</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stats.topEmployee ? (
                <>
                  <div className="text-2xl font-bold">{stats.topEmployee.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.topEmployee.reviews} reviews • {stats.topEmployee.points} points
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Leaderboard />

          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>Latest customer feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{review.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {review.job_type} • By {review.employee_name}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                
                {stats.recentReviews.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No reviews submitted yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}