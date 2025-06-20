'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'

export default function ProfileInitializer() {
  const { user, loading } = useAuth()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initializeUserProfile = async () => {
      if (!user || loading || initialized) return

      console.log('🔧 ProfileInitializer: Starting profile initialization for:', user.email)
      
      const supabase = createClient()

      try {
        // Check if user profile exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          console.log('👤 ProfileInitializer: Creating user profile')
          
          // Create user profile
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'business_owner'
            })

          if (userError) {
            console.error('ProfileInitializer: Error creating user profile:', userError)
          } else {
            console.log('✅ ProfileInitializer: User profile created')
          }
        }

        // For business owners, ensure they have a team
        if (user.user_metadata?.role === 'business_owner' || !user.user_metadata?.role) {
          const { data: existingTeams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)

          if (!existingTeams || existingTeams.length === 0) {
            console.log('🏢 ProfileInitializer: Creating default team and membership')
            
            // Create default team
            const { data: newTeam, error: teamError } = await supabase
              .from('teams')
              .insert({
                name: 'Review Team',
                description: 'Default team for collecting reviews'
              })
              .select()
              .single()

            if (teamError) {
              console.error('ProfileInitializer: Error creating team:', teamError)
            } else if (newTeam) {
              console.log('✅ ProfileInitializer: Team created:', newTeam.id)
              
              // Create team membership
              const { error: membershipError } = await supabase
                .from('team_members')
                .insert({
                  user_id: user.id,
                  team_id: newTeam.id,
                  role: 'admin'
                })

              if (membershipError) {
                console.error('ProfileInitializer: Error creating team membership:', membershipError)
              } else {
                console.log('✅ ProfileInitializer: Team membership created')
              }
            }
          }
        }

        setInitialized(true)
        console.log('🎉 ProfileInitializer: Initialization complete')

      } catch (error) {
        console.error('ProfileInitializer: Initialization error:', error)
        setInitialized(true) // Don't retry indefinitely
      }
    }

    initializeUserProfile()
  }, [user, loading, initialized])

  return null // This component doesn't render anything
}