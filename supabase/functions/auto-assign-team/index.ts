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
    
    // Extract domain from email (with @ prefix to match database format)
    const emailDomain = '@' + email.split('@')[1]
    
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
      // No domain mapping, try to find a default team or create one
      const { data: defaultTeam, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('name', 'Default Team')
        .single()
      
      if (defaultTeam) {
        targetTeamId = defaultTeam.id
      } else {
        // Create a default team if it doesn't exist
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: 'Default Team',
            description: 'Default team for users without domain mapping'
          })
          .select('id')
          .single()
        
        if (createError) {
          console.error('Error creating default team:', createError)
          throw createError
        }
        
        targetTeamId = newTeam.id
      }
      
      // If user role is business_owner, make them admin of default team
      const userMetaRole = payload.record.raw_user_meta_data?.role
      if (userMetaRole === 'business_owner') {
        userRole = 'admin'
      }
      
      console.log(`No domain mapping found. Assigning user to default team ${targetTeamId} with role: ${userRole}`)
    }

    // First, check if user profile exists or create it
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      // Create the user profile if it doesn't exist
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          name: payload.record.raw_user_meta_data?.name || email.split('@')[0],
          role: payload.record.raw_user_meta_data?.role || 'employee'
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        throw new Error(`Failed to create user profile: ${profileError.message}`)
      }
      
      console.log(`Created user profile for ${email}`)
    } else {
      console.log(`User profile already exists for ${email}`)
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