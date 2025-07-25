import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.GLITCHTIP_DSN || process.env.SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
})