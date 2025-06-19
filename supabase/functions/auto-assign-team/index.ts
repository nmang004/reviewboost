// Supabase Edge Function for Automated Team Assignment by Email Domain
// This function is triggered after a new user is created in auth.users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: string
  table: string
  record: {
    id: string
    email: string
    raw_user_meta_data?: {
      name?: string
      role?: string
    }
  }
  schema: string
  old_record: null | any
}

serve(async (req) => {
  try {
    // Only handle POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const payload: WebhookPayload = await req.json()
    
    // Only handle user insert events from auth.users table
    if (payload.type !== 'INSERT' || payload.table !== 'users' || payload.schema !== 'auth') {
      return new Response('Event not handled', { status: 200 })
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { id: userId, email } = payload.record
    
    // Extract domain from email
    const emailDomain = email.split('@')[1]
    
    console.log(`Processing new user: ${email} with domain: ${emailDomain}`)

    // Check if there's a team mapping for this domain
    const { data: domainMapping, error: domainError } = await supabase
      .from('team_domain_mapping')
      .select('team_id')
      .eq('domain_name', emailDomain)
      .single()

    if (domainError && domainError.code !== 'PGRST116') {
      console.error('Error checking domain mapping:', domainError)
      throw domainError
    }

    let targetTeamId: string
    let userRole: 'admin' | 'member' = 'member'

    if (domainMapping) {
      // Domain mapping exists, assign to that team
      targetTeamId = domainMapping.team_id
      console.log(`Found domain mapping. Assigning user to team: ${targetTeamId}`)
    } else {
      // No domain mapping, assign to default team
      targetTeamId = '00000000-0000-0000-0000-000000000001'
      
      // If user role is business_owner, make them admin of default team
      const userMetaRole = payload.record.raw_user_meta_data?.role
      if (userMetaRole === 'business_owner') {
        userRole = 'admin'
      }
      
      console.log(`No domain mapping found. Assigning user to default team with role: ${userRole}`)
    }

    // First, create the user profile (this might already be done by the trigger, but Edge Function runs separately)
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: payload.record.raw_user_meta_data?.name || email.split('@')[0],
        role: payload.record.raw_user_meta_data?.role || 'employee'
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Don't throw here, as the trigger might have already created the profile
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from('team_members')
      .upsert({
        user_id: userId,
        team_id: targetTeamId,
        role: userRole
      }, {
        onConflict: 'user_id,team_id'
      })

    if (memberError) {
      console.error('Error adding user to team:', memberError)
      throw memberError
    }

    console.log(`Successfully assigned user ${email} to team ${targetTeamId} with role ${userRole}`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        email: email,
        teamId: targetTeamId,
        role: userRole,
        message: 'User successfully assigned to team'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in auto-assign-team function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Configuration for the Edge Function
export const config = {
  runtime: 'edge',
}