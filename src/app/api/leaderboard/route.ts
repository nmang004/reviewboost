import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Removed unused auth-utils imports, using direct authentication

interface LeaderboardResult {
  employee_id: string
  employee_name: string
  employee_email: string
  total_reviews: number
  total_points: number
  rank: number
}

export async function GET(req: NextRequest) {
  try {
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
      console.error('Leaderboard API auth error:', authError?.message)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Verify user is member of the requested team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', authUser.id)
      .eq('team_id', teamId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    // Use the secure team leaderboard function from the database
    const { data: leaderboard, error } = await supabase
      .rpc('get_team_leaderboard', { 
        team_uuid: teamId,
        limit_count: 10
      })

    if (error) {
      console.error('Error fetching team leaderboard:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    // Format the response to match the expected interface
    const formattedLeaderboard = leaderboard?.map((item: LeaderboardResult) => ({
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      employee_email: item.employee_email,
      total_points: item.total_points,
      total_reviews: parseInt(item.total_reviews.toString()),
      rank: parseInt(item.rank.toString()),
    })) || []


    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      team_id: teamId,
      total_members: formattedLeaderboard.length
    })
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}