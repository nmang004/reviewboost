'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useTeam, useAuthenticatedFetch } from '@/contexts/TeamContext'
import { TeamSelector } from '@/components/TeamSelector'

const reviewSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  jobType: z.string().min(1, 'Please select a job type'),
  hasPhoto: z.boolean(),
  keywords: z.string().min(10, 'Please provide at least 10 characters of keywords'),
})

type ReviewFormData = z.infer<typeof reviewSchema>

const jobTypes = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Carpentry',
  'Painting',
  'Landscaping',
  'Roofing',
  'General Maintenance',
  'Other',
]

export default function SubmitReviewPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { currentTeam, teamsLoading } = useTeam()
  const authenticatedFetch = useAuthenticatedFetch()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      hasPhoto: false,
    },
  })

  const hasPhoto = watch('hasPhoto')


  useEffect(() => {
    // Wait for auth and teams to finish loading before checking user
    if (authLoading || teamsLoading) {
      return
    }
    
    if (!user) {
      console.log('No user found on submit-review page, redirecting to login')
      router.push('/login')
      return
    }

    if (user.role === 'business_owner') {
      console.log('Business owner redirected to dashboard')
      router.push('/dashboard')
      return
    }

    // Log successful auth state for debugging
    console.log('Submit-review page auth state:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamsLoaded: !teamsLoading,
      currentTeam: currentTeam?.name
    })
  }, [user, authLoading, teamsLoading, router, currentTeam])

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      console.error('No user available for review submission')
      router.push('/login')
      return
    }

    if (!currentTeam) {
      console.error('No team selected for review submission')
      alert('Please select a team before submitting a review.')
      return
    }

    console.log('Submitting review with:', {
      userId: user.id,
      teamId: currentTeam.id,
      teamName: currentTeam.name,
      customerName: data.customerName,
      jobType: data.jobType
    })

    setIsLoading(true)
    try {
      const response = await authenticatedFetch('/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: data.customerName,
          job_type: data.jobType,
          has_photo: data.hasPhoto,
          keywords: data.keywords,
          employee_id: user.id,
          team_id: currentTeam.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Review submission failed:', {
          status: response.status,
          error: errorData.error,
          userId: user.id,
          teamId: currentTeam.id
        })
        
        // Handle specific team membership error with helpful message
        if (errorData.error?.includes('not member of specified team')) {
          throw new Error(`Team membership issue detected. Please refresh the page and try again. If the problem persists, you may need to be re-added to the team.`)
        }
        
        throw new Error(errorData.error || 'Failed to submit review')
      }

      const result = await response.json()
      console.log('Review submitted successfully:', result)
      
      setSuccess(true)
      reset()
      
      // Show success message for 3 seconds then reset
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('Error submitting review:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to submit review: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while auth and teams are being checked
  if (authLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Team Selector */}
        <TeamSelector showCreateTeam={true} />
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Submit a Review</CardTitle>
            <CardDescription>
              Help us improve by submitting customer feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                Review submitted successfully! You&apos;ve earned points.
              </div>
            )}

            {!currentTeam && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
                Please select a team above before submitting a review.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer's full name"
                  {...register('customerName')}
                  disabled={isLoading || !currentTeam}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-600">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select
                  onValueChange={(value) => setValue('jobType', value)}
                  disabled={isLoading || !currentTeam}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.jobType && (
                  <p className="text-sm text-red-600">{errors.jobType.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPhoto"
                  checked={hasPhoto}
                  onCheckedChange={(checked) => setValue('hasPhoto', checked as boolean)}
                  disabled={isLoading || !currentTeam}
                />
                <Label
                  htmlFor="hasPhoto"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Customer provided a photo of completed work
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Review Keywords</Label>
                <Textarea
                  id="keywords"
                  placeholder="Enter keywords from the customer's review (e.g., professional, timely, clean work, friendly service)"
                  rows={4}
                  {...register('keywords')}
                  disabled={isLoading || !currentTeam}
                />
                {errors.keywords && (
                  <p className="text-sm text-red-600">{errors.keywords.message}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !currentTeam}
                >
                  {isLoading ? 'Submitting...' : !currentTeam ? 'Select Team First' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isLoading || !currentTeam}
                >
                  View Dashboard
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}