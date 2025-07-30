import { NextResponse } from 'next/server'

/**
 * Health check endpoint for Azure Container Apps
 * Returns the health status of the application
 */

export async function GET() {
  try {
    // Basic health check - could be extended to check database, redis, etc.
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'elastics-terminal',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    const errorHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'elastics-terminal',
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json(errorHealth, { status: 503 })
  }
}

// Support HEAD requests for health checks
export async function HEAD() {
  try {
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}