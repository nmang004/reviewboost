import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { POINTS_CONFIG, VALIDATION_CONFIG } from '@/lib/constants'
import { getUserFromHeaders } from '@/lib/auth-utils'
import { 
  withErrorHandler, 
  ApiErrorHandler, 
  validateRequired,
  validateUUID,
  validateStringLength 
} from '@/lib/api-error-handler'

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Get authenticated user from middleware headers
  const user = getUserFromHeaders(req)
  if (!user) {
    throw ApiErrorHandler.authRequired('Authentication required for review submission')
  }

  const body = await req.json()
  const { customer_name, job_type, has_photo, keywords, employee_id, team_id } = body

  // Validate required fields with proper error handling
  validateRequired(customer_name, 'customer_name')
  validateRequired(job_type, 'job_type')
  validateRequired(keywords, 'keywords')
  validateRequired(employee_id, 'employee_id')
  validateRequired(team_id, 'team_id')

  // Validate field formats and lengths
  validateUUID(employee_id, 'employee_id')
  validateUUID(team_id, 'team_id')
  validateStringLength(customer_name, 'customer_name', 1, VALIDATION_CONFIG.MAX_CUSTOMER_NAME_LENGTH)
  validateStringLength(job_type, 'job_type', 1, VALIDATION_CONFIG.MAX_JOB_TYPE_LENGTH)
  validateStringLength(keywords, 'keywords', 1, VALIDATION_CONFIG.MAX_KEYWORDS_LENGTH)

    // Enhanced auth validation: Get JWT token from headers and create authenticated client
    const jwtToken = req.headers.get('x-jwt-token') || req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!jwtToken) {
      console.error('No JWT token found for authenticated request')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Create Supabase client with user's JWT token for proper RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        }
      }
    )

    // Verify current session first to ensure auth state is valid
    const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser(jwtToken)
    
    if (sessionError || !currentUser) {
      console.error('Session validation failed:', sessionError?.message)
      throw ApiErrorHandler.authExpired('Invalid or expired authentication session')
    }

    // Ensure the session user matches the header user
    if (currentUser.id !== user.id) {
      console.error('User ID mismatch:', { headerUserId: user.id, sessionUserId: currentUser.id })
      throw ApiErrorHandler.authInvalid('Authentication state inconsistency detected')
    }

    // Verify that the authenticated user is a member of the specified team
    console.log(`Checking team membership for user ${currentUser.id} in team ${team_id}`)
    
    const { data: userTeamMembership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('team_id', team_id)
      .single()

    if (membershipError || !userTeamMembership) {
      console.error('Team membership validation failed:', {
        userId: currentUser.id,
        teamId: team_id,
        error: membershipError?.message,
        code: membershipError?.code
      })

      // Additional debugging: Check if user has any team memberships
      const { data: allMemberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', currentUser.id)
      
      console.error('User team memberships:', allMemberships)
      
      throw ApiErrorHandler.teamMembershipRequired('Access denied: user not member of specified team')
    }

    console.log(`Team membership validated: user ${currentUser.id} is ${userTeamMembership.role} in team ${team_id}`)

    // Verify that the employee_id belongs to the same team
    const { data: employeeTeamMembership, error: employeeError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('user_id', employee_id)
      .eq('team_id', team_id)
      .single()

    if (employeeError || !employeeTeamMembership) {
      console.error('Employee not member of team:', employeeError)
      throw ApiErrorHandler.resourceNotFound('employee', employee_id)
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
      throw ApiErrorHandler.databaseError('Failed to submit review', reviewError)
    }

    // Calculate points using configuration constants
    const points = POINTS_CONFIG.BASE_REVIEW_POINTS + 
      (has_photo ? POINTS_CONFIG.PHOTO_BONUS_POINTS : 0)

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
})