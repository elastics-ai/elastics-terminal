import * as Sentry from '@sentry/nextjs'

export function initErrorTracking() {
  const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN || process.env.GLITCHTIP_DSN

  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      
      // Integrations
      integrations: [
        new Sentry.BrowserTracing({
          // Set tracingOrigins to control what URLs are traced
          tracingOrigins: ['localhost', /^\//],
          // Route change tracking in Next.js
          routingInstrumentation: Sentry.nextRouterInstrumentation,
        }),
      ],

      // Filter out common errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random network errors
        'Network request failed',
        'NetworkError',
        'Failed to fetch',
        // Resize observer errors
        'ResizeObserver loop limit exceeded',
        // Non-error promise rejections
        'Non-Error promise rejection captured',
      ],

      // Before send hook to filter/modify events
      beforeSend(event, hint) {
        // Filter out errors from browser extensions
        if (event.exception) {
          const error = hint.originalException
          if (error && error.message) {
            // Filter out specific error patterns
            if (error.message.includes('Extension context')) {
              return null
            }
          }
        }
        
        // Add user context if available
        if (typeof window !== 'undefined') {
          event.contexts = {
            ...event.contexts,
            browser: {
              name: navigator.userAgent,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
              },
            },
          }
        }

        return event
      },
    })

    console.log('Error tracking initialized with GlitchTip')
  } else {
    console.warn('GLITCHTIP_DSN not set, error tracking disabled')
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  console.error('Captured exception:', error)
  
  if (Sentry.getCurrentHub().getClient()) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    })
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`Captured message [${level}]:`, message)
  
  if (Sentry.getCurrentHub().getClient()) {
    Sentry.captureMessage(message, level)
  }
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user)
}

export function addBreadcrumb(breadcrumb: {
  message: string
  category?: string
  level?: 'debug' | 'info' | 'warning' | 'error'
  data?: Record<string, any>
}) {
  Sentry.addBreadcrumb(breadcrumb)
}

export function withErrorBoundary<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  errorBoundaryOptions?: Sentry.ErrorBoundaryOptions
) {
  return Sentry.withErrorBoundary(Component, errorBoundaryOptions)
}