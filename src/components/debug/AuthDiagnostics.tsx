'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTeam, useAuthenticatedFetch } from '@/contexts/TeamContext' 
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export function AuthDiagnostics() {
  const { user, loading: authLoading } = useAuth()
  const { currentTeam, teamsLoading } = useTeam()
  const authenticatedFetch = useAuthenticatedFetch()
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDiagnostics(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const runDiagnostics = async () => {
    setDiagnostics([])
    addLog('🔍 Starting authentication diagnostics...')
    
    if (!user) {
      addLog('❌ No user found - please log in first')
      return
    }
    
    addLog(`✅ User authenticated: ${user.email} (${user.role})`)
    addLog(`🔗 User ID: ${user.id}`)
    
    if (!currentTeam) {
      addLog('❌ No current team selected')
      addLog(`📊 Teams loading: ${teamsLoading}`)
      return
    }
    
    addLog(`🏢 Current team: ${currentTeam.name} (${currentTeam.id})`)
    addLog(`👤 User role in team: ${currentTeam.user_role}`)
    
    // Test Supabase session
    try {
      const supabase = createSupabaseBrowser()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        addLog(`❌ Session error: ${sessionError.message}`)
        return
      }
      
      if (!session) {
        addLog('❌ No active session found')
        return
      }
      
      addLog('✅ Active session found - checking token...')
      addLog(`🎫 Token expires: ${new Date(session.expires_at! * 1000).toLocaleString()}`)
      
      // Test authenticated API calls
      addLog('🧪 Testing dashboard API call...')
      
      try {
        const response = await authenticatedFetch('/api/dashboard/stats')
        const responseText = await response.text()
        
        addLog(`📡 Dashboard API response: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          addLog('✅ Dashboard API call successful')
          try {
            const data = JSON.parse(responseText)
            addLog(`📊 Dashboard data: ${JSON.stringify(data, null, 2)}`)
          } catch {
            addLog('📊 Response is not JSON - might be HTML error page')
          }
        } else {
          addLog(`❌ Dashboard API failed: ${responseText}`)
        }
      } catch (fetchError) {
        addLog(`❌ Dashboard API error: ${fetchError}`)
      }
      
      // Test leaderboard API call
      addLog('🧪 Testing leaderboard API call...')
      
      try {
        const response = await authenticatedFetch('/api/leaderboard')
        const responseText = await response.text()
        
        addLog(`📡 Leaderboard API response: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          addLog('✅ Leaderboard API call successful')
          try {
            const data = JSON.parse(responseText)
            addLog(`🏆 Leaderboard data: ${JSON.stringify(data, null, 2)}`)
          } catch {
            addLog('🏆 Response is not JSON - might be HTML error page')
          }
        } else {
          addLog(`❌ Leaderboard API failed: ${responseText}`)
        }
      } catch (fetchError) {
        addLog(`❌ Leaderboard API error: ${fetchError}`)
      }
      
    } catch (error) {
      addLog(`❌ Diagnostics error: ${error}`)
    }
    
    addLog('🏁 Diagnostics complete')
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
        >
          🔍 Auth Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-4 bg-black/90 z-50 rounded-lg p-4 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-lg font-bold">Authentication Diagnostics</h2>
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            disabled={authLoading || teamsLoading}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Run Diagnostics
          </button>
          <button
            onClick={() => setDiagnostics([])}
            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="bg-gray-900 rounded p-3 flex-1 overflow-y-auto">
        <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">
          {diagnostics.length === 0 
            ? 'Click "Run Diagnostics" to start debugging...' 
            : diagnostics.join('\n')}
        </pre>
      </div>
    </div>
  )
}