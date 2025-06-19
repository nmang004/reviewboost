'use client'

import React, { useState } from 'react'
import { useTeam } from '@/contexts/TeamContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Users, 
  Settings, 
  Crown, 
  UserPlus, 
  Plus 
} from 'lucide-react'

interface TeamSelectorProps {
  showCreateTeam?: boolean
  showManagement?: boolean
  className?: string
}

export function TeamSelector({ 
  showCreateTeam = false, 
  showManagement = false,
  className = ''
}: TeamSelectorProps) {
  const { currentTeam, userTeams, teamsLoading, selectTeam, isTeamAdmin } = useTeam()
  const [showCreateForm, setShowCreateForm] = useState(false)

  if (teamsLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    )
  }

  if (userTeams.length === 0) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">No Teams Found</CardTitle>
          <CardDescription>
            You haven&apos;t been added to any teams yet. Contact your administrator to get added to a team.
          </CardDescription>
        </CardHeader>
        {showCreateTeam && (
          <CardContent className="text-center">
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Team
            </Button>
          </CardContent>
        )}
      </Card>
    )
  }

  const handleTeamChange = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId)
    if (team) {
      selectTeam(team)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Team Selector */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select 
            value={currentTeam?.id || ''} 
            onValueChange={handleTeamChange}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <SelectValue placeholder="Select a team..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {userTeams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{team.name}</span>
                    {team.user_role === 'admin' && (
                      <Crown className="h-3 w-3 text-yellow-500 ml-2" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showCreateTeam && (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Current Team Info */}
      {currentTeam && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{currentTeam.name}</h3>
                  <p className="text-sm text-gray-600">
                    Your role: {currentTeam.user_role === 'admin' ? 'Administrator' : 'Member'}
                  </p>
                </div>
              </div>

              {showManagement && isTeamAdmin(currentTeam.id) && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              )}
            </div>

            {currentTeam.description && (
              <p className="text-sm text-gray-600 mt-2">{currentTeam.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Team Form Modal */}
      {showCreateForm && (
        <CreateTeamModal 
          onClose={() => setShowCreateForm(false)}
          onTeamCreated={() => {
            setShowCreateForm(false)
            // Refresh teams will be handled by the context
          }}
        />
      )}
    </div>
  )
}

// Simple Create Team Modal Component
function CreateTeamModal({ 
  onClose, 
  onTeamCreated 
}: { 
  onClose: () => void
  onTeamCreated: () => void 
}) {
  const { refreshTeams } = useTeam()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to create team')

      await refreshTeams()
      onTeamCreated()
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Team</CardTitle>
          <CardDescription>
            Create a new team and become its administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Team Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter team name"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter team description"
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Creating...' : 'Create Team'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}