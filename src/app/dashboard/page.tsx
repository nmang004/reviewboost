'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalReviews: 0,
    totalPoints: 0,
    topEmployee: null,
    recentReviews: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🏢 Dashboard useEffect triggered')
    console.log('🔄 Auth loading:', authLoading)
    console.log('👤 Current user:', user)
    console.log('🏷️ User role:', user?.role)
    
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      console.log('⏳ Auth is still loading, waiting...')
      return
    }
    
    if (!user) {
      console.log('❌ No user found, redirecting to login')
      router.push('/login')
      return
    }

    if (user.role !== 'business_owner') {
      console.log('🚫 User is not business_owner, redirecting to submit-review')
      router.push('/submit-review')
      return
    }

    console.log('✅ User is business_owner, loading dashboard')
    fetchDashboardStats()
  }, [user, authLoading, router])

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


  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show loading state while dashboard data is being fetched
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2 text-lg">Welcome back! Here's your team's performance overview.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Total Reviews</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stats.totalReviews}</div>
              <p className="text-sm text-gray-600 font-medium">
                All-time customer reviews
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Total Points</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stats.totalPoints}</div>
              <p className="text-sm text-gray-600 font-medium">
                Points earned by all employees
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-yellow-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Top Employee</CardTitle>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {stats.topEmployee ? (
                <>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{stats.topEmployee.name}</div>
                  <p className="text-sm text-gray-600 font-medium">
                    {stats.topEmployee.reviews} reviews • {stats.topEmployee.points} points
                  </p>
                </>
              ) : (
                <p className="text-lg text-gray-500 font-medium">No reviews yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Leaderboard />

          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b border-gray-100 pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-900">Recent Reviews</CardTitle>
              <CardDescription className="text-lg text-gray-600">Latest customer feedback from your team</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {stats.recentReviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-gray-900">{review.customer_name}</p>
                      <p className="text-sm text-gray-600 font-medium">
                        {review.job_type} • By {review.employee_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 font-medium">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {stats.recentReviews.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">
                      No reviews submitted yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Reviews will appear here once your team starts submitting them
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}