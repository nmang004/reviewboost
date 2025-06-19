import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Check if this is an API route that needs authentication
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Skip authentication for certain public endpoints if needed
    const publicEndpoints = [
      '/api/health',
      '/api/ping'
    ]
    
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      req.nextUrl.pathname.startsWith(endpoint)
    )
    
    if (!isPublicEndpoint) {
      try {
        // Get the authorization header
        const authorization = req.headers.get('authorization')
        if (!authorization) {
          console.log('No authorization header found for API route:', req.nextUrl.pathname)
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        // Extract the JWT token
        const token = authorization.replace('Bearer ', '')
        
        // Create Supabase client for server-side validation
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Verify the JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
          console.log('Authentication failed for API route:', req.nextUrl.pathname, error?.message)
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        // Add user context to request headers for API routes to use
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-user-id', user.id)
        requestHeaders.set('x-user-email', user.email || '')
        
        // Add user role if available from user metadata
        const userRole = user.user_metadata?.role || 'employee'
        requestHeaders.set('x-user-role', userRole)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (error) {
        console.error('Middleware error:', error)
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 500 }
        )
      }
    }
  }

  // For non-API routes, continue with normal flow
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}