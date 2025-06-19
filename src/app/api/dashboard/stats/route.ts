import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get total reviews count
    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })

    // Get total points
    const { data: pointsData } = await supabase
      .from('points')
      .select('points')

    const totalPoints = pointsData?.reduce((sum, item) => sum + item.points, 0) || 0

    // Get top employee
    const { data: topEmployeeData } = await supabase
      .from('points')
      .select(`
        employee_id,
        points,
        users!inner(name)
      `)
      .order('points', { ascending: false })
      .limit(1)
      .single()

    let topEmployee = null
    if (topEmployeeData) {
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', topEmployeeData.employee_id)

      // Fix: Cast users as an object instead of array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = (topEmployeeData as any).users

      topEmployee = {
        name: userData.name,
        points: topEmployeeData.points,
        reviews: reviewCount || 0,
      }
    }

    // Get recent reviews
    const { data: recentReviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        customer_name,
        job_type,
        created_at,
        users!inner(name)
      `)
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

    return NextResponse.json({
      totalReviews: totalReviews || 0,
      totalPoints,
      topEmployee,
      recentReviews,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}