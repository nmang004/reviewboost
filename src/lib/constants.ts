// ============================================================================
// POINTS CONFIGURATION
// ============================================================================

export const POINTS_CONFIG = {
  BASE_REVIEW_POINTS: 10,
  PHOTO_BONUS_POINTS: 5
} as const

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2
} as const

// ============================================================================
// PAGINATION CONFIGURATION
// ============================================================================

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  RECENT_REVIEWS_LIMIT: 5,
  LEADERBOARD_LIMIT: 10
} as const

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

export const SESSION_CONFIG = {
  MAX_AUTH_RETRIES: 2,
  SESSION_REFRESH_DELAY_MS: 500,
  AUTH_TOKEN_HEADER: 'Authorization',
  JWT_TOKEN_HEADER: 'x-jwt-token'
} as const

// ============================================================================
// TEAM CONFIGURATION
// ============================================================================

export const TEAM_CONFIG = {
  MAX_TEAM_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  DEFAULT_TEAM_ROLE: 'member'
} as const

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

export const VALIDATION_CONFIG = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_EMAIL_LENGTH: 320,
  MAX_NAME_LENGTH: 100,
  MAX_CUSTOMER_NAME_LENGTH: 100,
  MAX_JOB_TYPE_LENGTH: 100,
  MAX_KEYWORDS_LENGTH: 1000
} as const