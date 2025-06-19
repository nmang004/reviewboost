'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'employee' | 'business_owner'>('employee')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    console.log('🔐 Starting login attempt for:', data.email)
    console.log('🎭 UI Role selected:', role)

    try {
      console.log('📡 Calling signIn...')
      const result = await signIn(data.email, data.password)
      console.log('✅ SignIn result:', result)
      console.log('👤 User profile:', result.userProfile)
      console.log('🏷️ User role from database:', result.userProfile?.role)
      
      // Redirect based on actual user role from database
      if (result.userProfile?.role === 'business_owner') {
        console.log('🏢 Redirecting to dashboard...')
        router.push('/dashboard')
      } else {
        console.log('👨‍💼 Redirecting to submit-review...')
        router.push('/submit-review')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      setError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to ReviewBoost
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  role === 'employee'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRole('employee')}
              >
                Employee
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  role === 'business_owner'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setRole('business_owner')}
              >
                Business Owner
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : `Sign in as ${role === 'employee' ? 'Employee' : 'Business Owner'}`}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-600">
          <p>
            Demo credentials: e@demo.com / demo123 or o@demo.com / demo123
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}