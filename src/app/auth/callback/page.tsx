'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type VerificationStatus = 'loading' | 'success' | 'error'

export default function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleVerification = async () => {
      // Wait a bit for auth state to settle
      timeoutId = setTimeout(() => {
        if (!loading) {
          if (user) {
            setStatus('success')
            setMessage('Email verified successfully! Your account is now active.')
            
            // Auto-redirect after 3 seconds
            setTimeout(() => {
              if (user.role === 'business_owner') {
                router.push('/dashboard')
              } else {
                router.push('/submit-review')
              }
            }, 3000)
          } else {
            setStatus('error')
            setMessage('Email verification failed or your account is still being set up. Please try signing in.')
          }
        }
      }, 2000) // Give 2 seconds for auth to process
    }

    handleVerification()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [user, loading, router])

  const handleRedirect = () => {
    if (status === 'success' && user) {
      if (user.role === 'business_owner') {
        router.push('/dashboard')
      } else {
        router.push('/submit-review')
      }
    } else {
      router.push('/')
    }
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Issue'}
          </CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Welcome to ReviewBoost! You&apos;ll be redirected automatically in a few seconds.
              </p>
              <Button onClick={handleRedirect} className="w-full">
                Continue to {user?.role === 'business_owner' ? 'Dashboard' : 'Submit Review'}
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <Button onClick={handleLogin} className="w-full">
                Try Signing In
              </Button>
              <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Please wait while we verify your email and set up your account...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}