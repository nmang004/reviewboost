'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function DataMigration() {
  const { user, loading } = useAuth()
  const [migrated, setMigrated] = useState(false)

  useEffect(() => {
    const migrateUserToReviewTeam = async () => {
      if (!user || loading || migrated) return

      console.log('🔄 DataMigration: Starting migration for:', user.email)
      
      const supabase = createSupabaseBrowser()

      try {
        // Check if there's a team with review data (f568ad74-cb94-4ebe-9fbd-171c77a5c9b9)
        const reviewTeamId = 'f568ad74-cb94-4ebe-9fbd-171c77a5c9b9'
        
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('id')
          .eq('team_id', reviewTeamId)
          .limit(1)

        if (reviewData && reviewData.length > 0) {
          console.log('📊 DataMigration: Found review data in team', reviewTeamId)
          
          // Check if user is already a member of this team
          const { data: existingMembership } = await supabase
            .from('team_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('team_id', reviewTeamId)
            .single()

          if (!existingMembership) {
            console.log('👥 DataMigration: Adding user to review team')
            
            // Add user to the team with review data
            const { error: membershipError } = await supabase
              .from('team_members')
              .insert({
                user_id: user.id,
                team_id: reviewTeamId,
                role: 'admin'
              })

            if (membershipError) {
              console.error('DataMigration: Error adding user to review team:', membershipError)
            } else {
              console.log('✅ DataMigration: Successfully added user to review team')
              
              // Update the team name to be consistent
              const { error: teamUpdateError } = await supabase
                .from('teams')
                .update({ name: 'Review Team' })
                .eq('id', reviewTeamId)

              if (teamUpdateError) {
                console.warn('DataMigration: Could not update team name:', teamUpdateError)
              } else {
                console.log('✅ DataMigration: Updated team name')
              }
            }
          } else {
            console.log('✅ DataMigration: User already member of review team')
          }
        } else {
          console.log('📭 DataMigration: No review data found, migration not needed')
        }

        setMigrated(true)
        console.log('🎉 DataMigration: Migration complete')

      } catch (error) {
        console.error('DataMigration: Migration error:', error)
        setMigrated(true) // Don't retry indefinitely
      }
    }

    migrateUserToReviewTeam()
  }, [user, loading, migrated])

  return null // This component doesn't render anything
}