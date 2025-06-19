// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string
  email: string
  role: 'employee' | 'business_owner'
  name: string
  created_at: string
}

// ============================================================================
// TEAM TYPES
// ============================================================================

export interface Team {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface TeamMemberWithUser extends TeamMember {
  user: User
}

export interface TeamWithUserRole extends Team {
  user_role: 'admin' | 'member'
  joined_at: string
}

export interface TeamDomainMapping {
  id: string
  team_id: string
  domain_name: string
  created_at: string
}

// ============================================================================
// REVIEW TYPES (Multi-Tenant)
// ============================================================================

export interface Review {
  id: string
  customer_name: string
  job_type: string
  has_photo: boolean
  keywords: string
  employee_id: string
  team_id: string // NEW: Team scoping
  created_at: string
  employee?: {
    name: string
    email: string
  }
}

export interface ReviewSubmission {
  customer_name: string
  job_type: string
  has_photo: boolean
  keywords: string
  employee_id: string
  team_id: string // NEW: Required for team scoping
}

// ============================================================================
// POINTS TYPES (Multi-Tenant)
// ============================================================================

export interface Points {
  id: string
  employee_id: string
  team_id: string // NEW: Team scoping
  points: number
  updated_at: string
}

export interface LeaderboardEntry {
  employee_id: string
  employee_name: string
  employee_email: string
  total_reviews: number
  total_points: number
  rank: number
}

export interface TeamLeaderboard {
  leaderboard: LeaderboardEntry[]
  team_id: string
  total_members: number
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardWidget {
  id: string
  team_id: string
  widget_type: 'kpi' | 'chart' | 'table' | 'metric'
  title: string
  data: Record<string, unknown>
  position: number
  is_active: boolean
  created_at: string
  last_updated: string
}

export interface DashboardStats {
  totalReviews: number
  totalPoints: number
  totalMembers: number
  topEmployee: {
    name: string
    points: number
    reviews: number
  } | null
  recentReviews: Array<{
    id: string
    customer_name: string
    employee_name: string
    job_type: string
    created_at: string
  }>
  recentReviewsCount: number
  team_id: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface TeamApiResponse {
  teams: TeamWithUserRole[]
  total_teams: number
}

export interface TeamMembersApiResponse {
  members: Array<{
    user_id: string
    name: string
    email: string
    role: 'admin' | 'member'
    joined_at: string
    user_created_at: string
  }>
  total_members: number
  team_id: string
  user_role: 'admin' | 'member'
}

export interface DashboardWidgetsApiResponse {
  widgets: DashboardWidget[]
  team_id: string
  total_widgets: number
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
}

export interface AuthContext {
  user: AuthenticatedUser
  teams: TeamMember[]
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TeamCreationForm {
  name: string
  description?: string
}

export interface AddMemberForm {
  user_id: string
  role: 'admin' | 'member'
}

export interface CreateWidgetForm {
  widget_type: 'kpi' | 'chart' | 'table' | 'metric'
  title: string
  data?: Record<string, unknown>
  position?: number
}

export interface UpdateWidgetForm {
  title?: string
  data?: Record<string, unknown>
  widget_type?: 'kpi' | 'chart' | 'table' | 'metric'
  position?: number
  is_active?: boolean
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type TeamRole = 'admin' | 'member'
export type UserRole = 'employee' | 'business_owner'
export type WidgetType = 'kpi' | 'chart' | 'table' | 'metric'

// Legacy types for backward compatibility
export type { User as Employee } // For existing code that uses Employee type