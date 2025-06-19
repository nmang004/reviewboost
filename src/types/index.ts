export interface User {
  id: string
  email: string
  role: 'employee' | 'business_owner'
  name: string
  created_at: string
}

export interface Review {
  id: string
  customer_name: string
  job_type: string
  has_photo: boolean
  keywords: string
  employee_id: string
  created_at: string
  employee?: {
    name: string
    email: string
  }
}

export interface Points {
  id: string
  employee_id: string
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