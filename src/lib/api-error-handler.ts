import { NextRequest, NextResponse } from 'next/server'

// Standard error codes for consistent frontend handling
export enum ErrorCodes {
  // Authentication & Authorization
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  
  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business Logic
  TEAM_MEMBERSHIP_REQUIRED = 'TEAM_MEMBERSHIP_REQUIRED',
  TEAM_ADMIN_REQUIRED = 'TEAM_ADMIN_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR'
}

// Standard error response interface
export interface ApiErrorResponse {
  error: string
  code: ErrorCodes
  details?: Record<string, unknown>
  timestamp: string
  path: string
  requestId?: string
}

// Custom error classes for different types of errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: ErrorCodes = ErrorCodes.AUTH_REQUIRED
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export class PermissionError extends Error {
  constructor(
    message: string,
    public requiredPermission?: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}

export class ResourceError extends Error {
  constructor(
    message: string,
    public resourceType?: string,
    public resourceId?: string
  ) {
    super(message)
    this.name = 'ResourceError'
  }
}

export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public code: ErrorCodes
  ) {
    super(message)
    this.name = 'BusinessLogicError'
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Main error handler class
export class ApiErrorHandler {
  static handle(error: unknown, request: NextRequest): NextResponse {
    const timestamp = new Date().toISOString()
    const path = request.nextUrl.pathname
    const requestId = request.headers.get('x-request-id') || undefined

    let response: ApiErrorResponse
    let status: number

    if (error instanceof ValidationError) {
      response = {
        error: error.message,
        code: ErrorCodes.VALIDATION_ERROR,
        details: error.details,
        timestamp,
        path,
        requestId
      }
      status = 400
    } else if (error instanceof AuthError) {
      response = {
        error: error.message,
        code: error.code,
        timestamp,
        path,
        requestId
      }
      status = error.code === ErrorCodes.AUTH_EXPIRED ? 401 : 401
    } else if (error instanceof PermissionError) {
      response = {
        error: error.message,
        code: ErrorCodes.PERMISSION_DENIED,
        details: error.requiredPermission ? { requiredPermission: error.requiredPermission } : undefined,
        timestamp,
        path,
        requestId
      }
      status = 403
    } else if (error instanceof ResourceError) {
      response = {
        error: error.message,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        details: {
          resourceType: error.resourceType,
          resourceId: error.resourceId
        },
        timestamp,
        path,
        requestId
      }
      status = 404
    } else if (error instanceof BusinessLogicError) {
      response = {
        error: error.message,
        code: error.code,
        timestamp,
        path,
        requestId
      }
      status = 400
    } else if (error instanceof DatabaseError) {
      console.error('Database error:', error.originalError)
      response = {
        error: 'Database operation failed',
        code: ErrorCodes.DATABASE_ERROR,
        timestamp,
        path,
        requestId
      }
      status = 500
    } else {
      // Log unexpected errors for debugging
      console.error('Unhandled API error:', {
        error,
        path,
        timestamp,
        requestId,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      response = {
        error: 'An unexpected error occurred',
        code: ErrorCodes.INTERNAL_ERROR,
        timestamp,
        path,
        requestId
      }
      status = 500
    }

    return NextResponse.json(response, { status })
  }

  // Convenience methods for common error scenarios
  static authRequired(message = 'Authentication required'): AuthError {
    return new AuthError(message, ErrorCodes.AUTH_REQUIRED)
  }

  static authInvalid(message = 'Invalid authentication credentials'): AuthError {
    return new AuthError(message, ErrorCodes.AUTH_INVALID)
  }

  static authExpired(message = 'Authentication token has expired'): AuthError {
    return new AuthError(message, ErrorCodes.AUTH_EXPIRED)
  }

  static permissionDenied(message = 'Insufficient permissions', requiredPermission?: string): PermissionError {
    return new PermissionError(message, requiredPermission)
  }

  static teamMembershipRequired(message = 'Team membership required'): BusinessLogicError {
    return new BusinessLogicError(message, ErrorCodes.TEAM_MEMBERSHIP_REQUIRED)
  }

  static teamAdminRequired(message = 'Team administrator access required'): BusinessLogicError {
    return new BusinessLogicError(message, ErrorCodes.TEAM_ADMIN_REQUIRED)
  }

  static resourceNotFound(resourceType?: string, resourceId?: string): ResourceError {
    const message = resourceType 
      ? `${resourceType}${resourceId ? ` with ID ${resourceId}` : ''} not found`
      : 'Requested resource not found'
    return new ResourceError(message, resourceType, resourceId)
  }

  static validationError(message: string, details?: Record<string, unknown>): ValidationError {
    return new ValidationError(message, details)
  }

  static databaseError(message: string, originalError?: unknown): DatabaseError {
    return new DatabaseError(message, originalError)
  }
}

// Higher-order function to wrap API route handlers with standardized error handling
export function withErrorHandler<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      return ApiErrorHandler.handle(error, req)
    }
  }
}

// Validation helper functions
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined || value === '') {
    throw ApiErrorHandler.validationError(
      `${fieldName} is required`,
      { field: fieldName, received: value }
    )
  }
  return value
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw ApiErrorHandler.validationError(
      'Invalid email format',
      { field: 'email', received: email }
    )
  }
  return email
}

export function validateUUID(id: string, fieldName = 'id'): string {
  // More practical UUID validation that allows nil UUIDs and common patterns
  // Validates basic structure: 8-4-4-4-12 hexadecimal characters
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw ApiErrorHandler.validationError(
      `Invalid ${fieldName} format`,
      { field: fieldName, received: id, expected: 'UUID format' }
    )
  }
  return id
}

export function validateStringLength(
  value: string,
  fieldName: string,
  minLength = 0,
  maxLength = 1000
): string {
  if (value.length < minLength) {
    throw ApiErrorHandler.validationError(
      `${fieldName} must be at least ${minLength} characters`,
      { field: fieldName, minLength, received: value.length }
    )
  }
  if (value.length > maxLength) {
    throw ApiErrorHandler.validationError(
      `${fieldName} must be no more than ${maxLength} characters`,
      { field: fieldName, maxLength, received: value.length }
    )
  }
  return value
}