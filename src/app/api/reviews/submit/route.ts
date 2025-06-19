import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromHeaders, createErrorResponse, ApiError } from '@/lib/auth-utils'

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from middleware headers
    const user = getUserFromHeaders(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { customer_name, job_type, has_photo, keywords, employee_id, team_id } = body

    // Validate required fields
    if (!customer_name || !job_type || !keywords || !employee_id || !team_id) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, job_type, keywords, employee_id, team_id' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Verify that the authenticated user is a member of the specified team
    const { data: userTeamMembership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', team_id)
      .single()

    if (membershipError || !userTeamMembership) {
      console.error('User not member of team:', membershipError)
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    // Verify that the employee_id belongs to the same team
    const { data: employeeTeamMembership, error: employeeError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('user_id', employee_id)
      .eq('team_id', team_id)
      .single()

    if (employeeError || !employeeTeamMembership) {
      console.error('Employee not member of team:', employeeError)
      return NextResponse.json(
        { error: 'Access denied: employee not member of specified team' },
        { status: 403 }
      )
    }

    // Insert review with team_id for proper data isolation
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        customer_name,
        job_type,
        has_photo: has_photo || false,
        keywords,
        employee_id,
        team_id, // Critical: Include team_id for data isolation
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error inserting review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to submit review' },
        { status: 500 }
      )
    }

    // Calculate points (base 10 points + 5 bonus for photo)
    const points = has_photo ? 15 : 10

    // Update or insert points for the employee (team-scoped)
    const { data: existingPoints } = await supabase
      .from('points')
      .select('points')
      .eq('employee_id', employee_id)
      .eq('team_id', team_id) // Ensure team-scoped points lookup
      .single()

    if (existingPoints) {
      // Update existing points
      const { error: pointsError } = await supabase
        .from('points')
        .update({ 
          points: existingPoints.points + points,
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employee_id)
        .eq('team_id', team_id) // Ensure team-scoped points update

      if (pointsError) {
        console.error('Error updating points:', pointsError)
        // Don't fail the request if points update fails
      }
    } else {
      // Insert new points record with team_id
      const { error: pointsError } = await supabase
        .from('points')
        .insert({ 
          employee_id, 
          points,
          team_id // Critical: Include team_id for data isolation
        })

      if (pointsError) {
        console.error('Error inserting points:', pointsError)
        // Don't fail the request if points insertion fails
      }
    }

    console.log(`Review submitted successfully by user ${user.id} for employee ${employee_id} in team ${team_id}`)

    return NextResponse.json({ 
      success: true, 
      review, 
      points,
      team_id 
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in review submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}