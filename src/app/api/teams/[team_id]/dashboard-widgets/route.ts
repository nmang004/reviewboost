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

    // Get team dashboard widgets (RLS will automatically filter by team)
    const { data: widgets, error } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching dashboard widgets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard widgets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      widgets: widgets || [],
      team_id: teamId,
      total_widgets: widgets?.length || 0
    })
  } catch (error) {
    console.error('Error in dashboard widgets GET endpoint:', error)
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

    // Validate team admin access (only admins can create widgets)
    const adminValidation = await validateTeamAdmin(req, teamId)
    if (!adminValidation.isValid || !adminValidation.user) {
      return NextResponse.json(
        { error: 'Access denied: team admin access required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { widget_type, title, data = {}, position = 0 } = body

    // Validate required fields
    if (!widget_type || !title) {
      return NextResponse.json(
        { error: 'widget_type and title are required' },
        { status: 400 }
      )
    }

    // Validate widget type
    const validTypes = ['kpi', 'chart', 'table', 'metric']
    if (!validTypes.includes(widget_type)) {
      return NextResponse.json(
        { error: `Invalid widget_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create the dashboard widget
    const { data: widget, error: createError } = await supabase
      .from('dashboard_widgets')
      .insert({
        team_id: teamId,
        widget_type,
        title: title.trim(),
        data: data || {},
        position: position || 0,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating dashboard widget:', createError)
      return NextResponse.json(
        { error: 'Failed to create dashboard widget' },
        { status: 500 }
      )
    }

    console.log(`Dashboard widget created: ${widget.id} for team ${teamId} by admin ${adminValidation.user.id}`)

    return NextResponse.json({
      success: true,
      widget
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in dashboard widgets POST endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}