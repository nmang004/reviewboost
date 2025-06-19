import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, job_type, has_photo, keywords, employee_id } = body

    // Validate required fields
    if (!customer_name || !job_type || !keywords || !employee_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        customer_name,
        job_type,
        has_photo: has_photo || false,
        keywords,
        employee_id,
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

    // Update or insert points for the employee
    const { data: existingPoints } = await supabase
      .from('points')
      .select('points')
      .eq('employee_id', employee_id)
      .single()

    if (existingPoints) {
      // Update existing points
      const { error: pointsError } = await supabase
        .from('points')
        .update({ points: existingPoints.points + points })
        .eq('employee_id', employee_id)

      if (pointsError) {
        console.error('Error updating points:', pointsError)
      }
    } else {
      // Insert new points record
      const { error: pointsError } = await supabase
        .from('points')
        .insert({ employee_id, points })

      if (pointsError) {
        console.error('Error inserting points:', pointsError)
      }
    }

    return NextResponse.json({ success: true, review, points })
  } catch (error) {
    console.error('Error in review submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}