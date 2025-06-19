import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateTeamMembership, validateTeamAdmin, createErrorResponse, ApiError } from '@/lib/auth-utils'

interface RouteParams {
  team_id: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { team_id: teamId } = await params

    // Validate team membership
    const validation = await validateTeamMembership(req, teamId)
    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get team members with user details
    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        joined_at,
        users!inner(
          id,
          name,
          email,
          created_at
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedMembers = members?.map(member => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = (member as any).users
      return {
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        role: member.role,
        joined_at: member.joined_at,
        user_created_at: userData.created_at
      }
    }) || []

    return NextResponse.json({
      members: formattedMembers,
      total_members: formattedMembers.length,
      team_id: teamId,
      user_role: validation.role
    })
  } catch (error) {
    console.error('Error in team members GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { team_id: teamId } = await params

    // Validate team admin access
    const adminValidation = await validateTeamAdmin(req, teamId)
    if (!adminValidation.isValid || !adminValidation.user) {
      return NextResponse.json(
        { error: 'Access denied: team admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { user_id, role = 'member' } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or member' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user_id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Use the secure database function to add user to team
    const { error: addError } = await supabase
      .rpc('add_user_to_team', {
        target_user_id: user_id,
        target_team_id: teamId,
        user_role: role
      })

    if (addError) {
      console.error('Error adding user to team:', addError)
      return NextResponse.json(
        { error: addError.message || 'Failed to add user to team' },
        { status: 500 }
      )
    }

    console.log(`User ${user_id} added to team ${teamId} with role ${role} by admin ${adminValidation.user.id}`)

    return NextResponse.json({
      success: true,
      member: {
        user_id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: role,
        joined_at: new Date().toISOString()
      }
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in team members POST endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { team_id: teamId } = await params
    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get('user_id')

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      )
    }

    // Validate team membership for the calling user
    const validation = await validateTeamMembership(req, teamId)
    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    // Users can remove themselves, or admins can remove others
    const canRemove = validation.user.id === targetUserId || validation.role === 'admin'
    
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Access denied: can only remove yourself or admin can remove others' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Use the secure database function to remove user from team
    const { error: removeError } = await supabase
      .rpc('remove_user_from_team', {
        target_user_id: targetUserId,
        target_team_id: teamId
      })

    if (removeError) {
      console.error('Error removing user from team:', removeError)
      return NextResponse.json(
        { error: removeError.message || 'Failed to remove user from team' },
        { status: 500 }
      )
    }

    console.log(`User ${targetUserId} removed from team ${teamId} by user ${validation.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'User removed from team successfully'
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in team members DELETE endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}