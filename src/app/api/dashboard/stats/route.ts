import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Removed unused auth-utils imports, using direct authentication

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Dashboard stats API called')

    // Get team_id from query parameters
    const teamId = req.nextUrl.searchParams.get('team_id')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'team_id parameter is required' },
        { status: 400 }
      )
    }

    // Get and validate user authentication directly
    const authorization = req.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify user authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser) {
      console.error('Dashboard API auth error:', authError?.message)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check team membership directly
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', authUser.id)
      .eq('team_id', teamId)
      .single()

    if (membershipError || !membership) {
      console.error('Team membership check failed:', membershipError?.message)
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    console.log('✅ Dashboard API: User has valid team membership:', membership.role)

    // Use the secure team dashboard stats function from the database
    const { data: statsData, error } = await supabase
      .rpc('get_team_dashboard_stats', { 
        team_uuid: teamId
      })

    if (error) {
      console.error('Error fetching team dashboard stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard stats' },
        { status: 500 }
      )
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
      .limit(5)

    const recentReviews = recentReviewsData?.map(review => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = (review as any).users
      return {
        id: review.id,
        customer_name: review.customer_name,
        employee_name: userData.name,
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

    console.log(`Dashboard stats fetched for team ${teamId} by user ${authUser.id}`)

    return NextResponse.json(dashboardStats)
  } catch (error) {
    console.error('Error in dashboard stats endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}