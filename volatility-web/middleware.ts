import { NextRequest, NextResponse } from 'next/server'

/**
 * Basic Authentication Middleware for Azure deployment
 * Only applies when AZURE_DEPLOYMENT environment variable is set
 */

const BASIC_AUTH_EMAIL = process.env.BASIC_AUTH_EMAIL || 'wojciech@elastics.ai'
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'demo123!'
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT === 'true'

function isValidCredentials(authorization: string): boolean {
  try {
    const encoded = authorization.replace('Basic ', '')
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const [email, password] = decoded.split(':')
    
    return email === BASIC_AUTH_EMAIL && password === BASIC_AUTH_PASSWORD
  } catch (error) {
    return false
  }
}

export function middleware(request: NextRequest) {
  // Only apply basic auth for Azure deployment
  if (!AZURE_DEPLOYMENT) {
    return NextResponse.next()
  }

  // Skip auth for health check endpoints
  const pathname = request.nextUrl.pathname
  if (pathname === '/api/health' || pathname === '/health') {
    return NextResponse.next()
  }

  // Skip auth for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') && !pathname.endsWith('/') // files with extensions but not directories
  ) {
    return NextResponse.next()
  }

  const authorization = request.headers.get('authorization')

  if (!authorization || !isValidCredentials(authorization)) {
    return new NextResponse('Authentication required for Elastics Terminal', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Elastics Terminal - Use email: wojciech@elastics.ai"',
        'Content-Type': 'text/plain'
      }
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health checks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}