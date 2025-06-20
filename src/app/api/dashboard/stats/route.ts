import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAGINATION_CONFIG } from '@/lib/constants'
import { withErrorHandler, ApiErrorHandler, validateRequired, validateUUID } from '@/lib/api-error-handler'

// Define proper type for review with joined user data
interface ReviewWithUser {
  id: string
  customer_name: string
  job_type: string
  created_at: string
  users: {
    name: string
  }[]
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  // Get team_id from query parameters
  const teamId = req.nextUrl.searchParams.get('team_id')
  
  validateRequired(teamId, 'team_id')
  validateUUID(teamId!, 'team_id')

  // Get and validate user authentication directly
  const authorization = req.headers.get('authorization')
  if (!authorization) {
    throw ApiErrorHandler.authRequired()
  }

    const token = authorization.replace('Bearer ', '')

    // Create Supabase client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

  // Verify user authentication
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw ApiErrorHandler.authInvalid()
  }

    // Check team membership directly
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', authUser.id)
      .eq('team_id', teamId)
      .single()

  if (membershipError || !membership) {
    throw ApiErrorHandler.teamMembershipRequired()
  }

    // Use the secure team dashboard stats function from the database
    const { data: statsData, error } = await supabase
      .rpc('get_team_dashboard_stats', { 
        team_uuid: teamId
      })

  if (error) {
    console.error('Error fetching team dashboard stats:', error)
    throw ApiErrorHandler.databaseError('Failed to fetch dashboard stats', error)
  }

    // Get recent reviews for the team (RLS will automatically filter by team)
    const { data: recentReviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        customer_name,
        job_type,
        created_at,
        users!inner(name)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(PAGINATION_CONFIG.RECENT_REVIEWS_LIMIT)

    const recentReviews = recentReviewsData?.map((review: ReviewWithUser) => {
      return {
        id: review.id,
        customer_name: review.customer_name,
        employee_name: review.users[0]?.name || 'Unknown',
        job_type: review.job_type,
        created_at: review.created_at,
      }
    }) || []

    // Format the response with data from the secure function
    const stats = statsData?.[0]
    const dashboardStats = {
      totalReviews: parseInt(stats?.total_reviews?.toString() || '0'),
      totalPoints: parseInt(stats?.total_points?.toString() || '0'),
      totalMembers: parseInt(stats?.total_members?.toString() || '0'),
      topEmployee: stats?.top_employee_name ? {
        name: stats.top_employee_name,
        points: stats.top_employee_points || 0,
        reviews: 0 // Could be calculated separately if needed
      } : null,
      recentReviews,
      recentReviewsCount: parseInt(stats?.recent_reviews_count?.toString() || '0'),
      team_id: teamId
    }


    return NextResponse.json(dashboardStats)
})