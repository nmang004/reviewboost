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
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return
    }
    
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role === 'business_owner') {
      router.push('/dashboard')
      return
    }
  }, [user, authLoading, router])

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: data.customerName,
          job_type: data.jobType,
          has_photo: data.hasPhoto,
          keywords: data.keywords,
          employee_id: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      setSuccess(true)
      reset()
      
      // Show success message for 3 seconds then reset
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer's full name"
                  {...register('customerName')}
                  disabled={isLoading}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-600">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select
                  onValueChange={(value) => setValue('jobType', value)}
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
                {errors.keywords && (
                  <p className="text-sm text-red-600">{errors.keywords.message}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isLoading}
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