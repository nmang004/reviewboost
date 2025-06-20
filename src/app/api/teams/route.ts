import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromHeaders, createErrorResponse, ApiError } from '@/lib/auth-utils'

export async function GET(req: NextRequest) {
  try {
    // Try to get user from middleware headers first
    let user = getUserFromHeaders(req)
    
    // If middleware didn't set headers, try to get user from auth token directly
    if (!user) {
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

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !authUser) {
        console.error('Auth error in teams API:', authError?.message)
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user profile from database using service client to avoid RLS issues
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { data: profile, error: profileError } = await serviceClient
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile fetch error in teams API:', profileError?.message)
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      user = {
        id: profile.id,
        email: profile.email,
        role: profile.role
      }
    }

    // Use service client for team membership queries to avoid RLS issues
    // This is necessary because the RLS policies might be too restrictive
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user's team memberships with team details
    const { data: teams, error } = await serviceClient
      .from('team_members')
      .select(`
        team_id,
        role,
        joined_at,
        teams!inner(
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching user teams:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedTeams = teams?.map(membership => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teamData = (membership as any).teams
      return {
        id: teamData.id,
        name: teamData.name,
        description: teamData.description,
        created_at: teamData.created_at,
        user_role: membership.role,
        joined_at: membership.joined_at
      }
    }) || []

    return NextResponse.json({
      teams: formattedTeams,
      total_teams: formattedTeams.length
    })
  } catch (error) {
    console.error('Error in teams GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get user from middleware headers first
    let user = getUserFromHeaders(req)
    
    // If middleware didn't set headers, try to get user from auth token directly
    if (!user) {
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

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !authUser) {
        console.error('Auth error in teams API:', authError?.message)
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile fetch error in teams API:', profileError?.message)
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      user = {
        id: profile.id,
        email: profile.email,
        role: profile.role
      }
    }

    const body = await req.json()
    const { name, description } = body

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }

    // The trigger will automatically add the creator as admin, but let's verify
    const { error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', team.id)
      .single()

    if (membershipError) {
      console.error('Error verifying team membership:', membershipError)
      // The team was created but membership might have failed
      // This is handled by the database trigger, but we can log for debugging
    }

    console.log(`Team created successfully: ${team.id} by user ${user.id}`)

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        created_at: team.created_at,
        user_role: 'admin' // Creator is always admin
      }
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in teams POST endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}