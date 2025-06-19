import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateTeamMembership, validateTeamAdmin, createErrorResponse, ApiError } from '@/lib/auth-utils'

interface RouteParams {
  team_id: string
  widget_id: string
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { team_id: teamId, widget_id: widgetId } = await params

    // Validate team membership (members can update widget data)
    const validation = await validateTeamMembership(req, teamId)
    if (!validation.isValid || !validation.user) {
      return NextResponse.json(
        { error: 'Access denied: user not member of specified team' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { data, title, widget_type, position, is_active } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Check if widget exists and belongs to the team
    const { data: existingWidget, error: fetchError } = await supabase
      .from('dashboard_widgets')
      .select('id, team_id, widget_type')
      .eq('id', widgetId)
      .eq('team_id', teamId)
      .single()

    if (fetchError || !existingWidget) {
      return NextResponse.json(
        { error: 'Dashboard widget not found' },
        { status: 404 }
      )
    }

    // For structural changes (title, type, position, activation), require admin access
    const isStructuralChange = title !== undefined || widget_type !== undefined || 
                              position !== undefined || is_active !== undefined

    if (isStructuralChange) {
      const adminValidation = await validateTeamAdmin(req, teamId)
      if (!adminValidation.isValid) {
        return NextResponse.json(
          { error: 'Access denied: team admin access required for structural changes' },
          { status: 403 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    if (data !== undefined) {
      updateData.data = data
      updateData.last_updated = new Date().toISOString()
    }
    
    if (title !== undefined) {
      updateData.title = title.trim()
    }
    
    if (widget_type !== undefined) {
      const validTypes = ['kpi', 'chart', 'table', 'metric']
      if (!validTypes.includes(widget_type)) {
        return NextResponse.json(
          { error: `Invalid widget_type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.widget_type = widget_type
    }
    
    if (position !== undefined) {
      updateData.position = position
    }
    
    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    // Update the widget
    const { data: updatedWidget, error: updateError } = await supabase
      .from('dashboard_widgets')
      .update(updateData)
      .eq('id', widgetId)
      .eq('team_id', teamId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating dashboard widget:', updateError)
      return NextResponse.json(
        { error: 'Failed to update dashboard widget' },
        { status: 500 }
      )
    }

    console.log(`Dashboard widget updated: ${widgetId} for team ${teamId} by user ${validation.user.id}`)

    return NextResponse.json({
      success: true,
      widget: updatedWidget
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in dashboard widget PUT endpoint:', error)
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
    const { team_id: teamId, widget_id: widgetId } = await params

    // Validate team admin access (only admins can delete widgets)
    const adminValidation = await validateTeamAdmin(req, teamId)
    if (!adminValidation.isValid || !adminValidation.user) {
      return NextResponse.json(
        { error: 'Access denied: team admin access required' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Delete the widget (RLS will ensure it belongs to the team)
    const { error: deleteError } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', widgetId)
      .eq('team_id', teamId)

    if (deleteError) {
      console.error('Error deleting dashboard widget:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete dashboard widget' },
        { status: 500 }
      )
    }

    console.log(`Dashboard widget deleted: ${widgetId} from team ${teamId} by admin ${adminValidation.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Dashboard widget deleted successfully'
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return createErrorResponse(error)
    }
    
    console.error('Error in dashboard widget DELETE endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}