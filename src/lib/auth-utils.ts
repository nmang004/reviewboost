import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
}

export interface TeamMember {
  user_id: string
  team_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface AuthContext {
  user: AuthenticatedUser
  teams: TeamMember[]
}

/**
 * Get authenticated user from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest): AuthenticatedUser | null {
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')
  const userRole = request.headers.get('x-user-role')

  if (!userId || !userEmail) {
    return null
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole || 'employee'
  }
}

/**
 * Get full authentication context including user's team memberships
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const user = getUserFromHeaders(request)
  if (!user) {
    return null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get user's team memberships
  const { data: teams, error } = await supabase
    .from('team_members')
    .select('user_id, team_id, role, joined_at')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching user teams:', error)
    return null
  }

  return {
    user,
    teams: teams || []
  }
}

/**
 * Validate if user is member of a specific team
 */
export async function validateTeamMembership(
  request: NextRequest, 
  teamId: string
): Promise<{ isValid: boolean; user: AuthenticatedUser | null; role: 'admin' | 'member' | null }> {
  const authContext = await getAuthContext(request)
  
  if (!authContext) {
    return { isValid: false, user: null, role: null }
  }

  const teamMembership = authContext.teams.find(team => team.team_id === teamId)
  
  return {
    isValid: !!teamMembership,
    user: authContext.user,
    role: teamMembership?.role || null
  }
}

/**
 * Validate if user is admin of a specific team
 */
export async function validateTeamAdmin(
  request: NextRequest, 
  teamId: string
): Promise<{ isValid: boolean; user: AuthenticatedUser | null }> {
  const validation = await validateTeamMembership(request, teamId)
  
  return {
    isValid: validation.isValid && validation.role === 'admin',
    user: validation.user
  }
}

/**
 * Get user's accessible teams
 */
export async function getUserTeams(request: NextRequest): Promise<TeamMember[]> {
  const authContext = await getAuthContext(request)
  return authContext?.teams || []
}

/**
 * Helper to create standardized error responses
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 400
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function createErrorResponse(error: ApiError | Error): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    )
  }
  
  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

/**
 * Validate team ownership for data modification operations
 */
export async function validateTeamDataOwnership(
  request: NextRequest,
  teamId: string,
  requireAdmin: boolean = false
): Promise<AuthenticatedUser> {
  const validation = requireAdmin 
    ? await validateTeamAdmin(request, teamId)
    : await validateTeamMembership(request, teamId)

  if (!validation.isValid || !validation.user) {
    throw new ApiError(
      requireAdmin 
        ? 'Team admin access required'
        : 'Team membership required',
      403
    )
  }

  return validation.user
}

/**
 * Extract team ID from various sources (query params, request body, etc.)
 */
export function extractTeamId(request: NextRequest, body?: Record<string, unknown>): string | null {
  // Try to get from query parameters
  const teamIdFromQuery = request.nextUrl.searchParams.get('team_id')
  if (teamIdFromQuery) {
    return teamIdFromQuery
  }

  // Try to get from request body
  if (body?.team_id && typeof body.team_id === 'string') {
    return body.team_id
  }

  // Try to get from URL path (e.g., /api/teams/[team_id]/...)
  const pathSegments = request.nextUrl.pathname.split('/')
  const teamsIndex = pathSegments.indexOf('teams')
  if (teamsIndex !== -1 && pathSegments[teamsIndex + 1]) {
    return pathSegments[teamsIndex + 1]
  }

  return null
}

/**
 * Create a Supabase client configured for service-level operations
 * This bypasses RLS policies for system operations
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Check if the current operation should be treated as a service-level operation
 * Service operations can bypass certain RLS restrictions
 */
export function isServiceOperation(request: NextRequest): boolean {
  // Check for service operation header (set by internal API calls)
  const serviceOp = request.headers.get('x-service-operation')
  if (serviceOp === 'true') {
    return true
  }

  // Check for specific API endpoints that require service-level access
  const serviceEndpoints = [
    '/api/reviews/submit',
    '/api/dashboard/stats',
    '/api/leaderboard'
  ]

  return serviceEndpoints.some(endpoint => 
    request.nextUrl.pathname.startsWith(endpoint)
  )
}

/**
 * Enhanced authentication context with service operation support
 */
export interface EnhancedAuthContext extends AuthContext {
  isServiceOperation: boolean
  serviceClient?: ReturnType<typeof createServiceClient>
}

/**
 * Get enhanced authentication context with service operation support
 */
export async function getEnhancedAuthContext(request: NextRequest): Promise<EnhancedAuthContext | null> {
  const isService = isServiceOperation(request)
  const baseContext = await getAuthContext(request)
  
  if (!baseContext && !isService) {
    return null
  }

  return {
    user: baseContext?.user || { id: 'service', email: 'service@system', role: 'service' },
    teams: baseContext?.teams || [],
    isServiceOperation: isService,
    serviceClient: isService ? createServiceClient() : undefined
  }
}