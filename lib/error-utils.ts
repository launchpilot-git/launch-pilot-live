export interface ErrorDetails {
  message: string
  code?: string
  details?: string
  hint?: string
  userId?: string
  timestamp: string
  context: string
  retryCount?: number
  userAgent?: string
}

export function logError(context: string, error: any, additionalInfo?: Record<string, any>): ErrorDetails {
  const errorDetails: ErrorDetails = {
    message: error instanceof Error ? error.message : String(error),
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    timestamp: new Date().toISOString(),
    context,
    ...additionalInfo
  }

  // Log to console with structured format
  console.error(`[${context}] Error occurred:`, errorDetails)

  // In production, you could also send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // errorTrackingService.captureError(error, errorDetails)
  }

  return errorDetails
}

export function isRetryableError(error: any): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Don't retry auth/permission errors
  if (errorMessage.includes('permission') || 
      errorMessage.includes('unauthorized') || 
      errorMessage.includes('forbidden') ||
      errorMessage.includes('authentication')) {
    return false
  }

  // Don't retry validation errors
  if (errorMessage.includes('validation') || 
      errorMessage.includes('invalid') ||
      error?.code === '23505') { // Unique constraint violation
    return false
  }

  // Retry network, timeout, and temporary errors
  return true
}

export function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  return 'An unknown error occurred'
} 