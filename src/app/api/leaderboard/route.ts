import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get leaderboard data with employee information
    const { data, error } = await supabase
      .from('points')
      .select(`
        employee_id,
        points,
        users!inner(name, email)
      `)
      .order('points', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      )
    }

    // Get review counts for each employee
    const employeeIds = data?.map(item => item.employee_id) || []
    const { data: reviewCounts } = await supabase
      .from('reviews')
      .select('employee_id')
      .in('employee_id', employeeIds)

    // Count reviews per employee
    const reviewCountMap = reviewCounts?.reduce((acc, review) => {
      acc[review.employee_id] = (acc[review.employee_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Format leaderboard data
    const leaderboard = data?.map((item, index) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = (item as any).users
      return {
        employee_id: item.employee_id,
        employee_name: userData.name,
        employee_email: userData.email,
        total_points: item.points,
        total_reviews: reviewCountMap[item.employee_id] || 0,
        rank: index + 1,
      }
    }) || []

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Error in leaderboard endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}