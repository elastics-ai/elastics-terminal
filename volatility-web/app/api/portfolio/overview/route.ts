import { NextResponse } from 'next/server'

// API endpoint for portfolio overview data
export async function GET() {
  try {
    // Call the Python backend API
    const response = await fetch('http://localhost:8000/api/portfolio/overview', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching portfolio overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio overview' },
      { status: 500 }
    )
  }
}

// WebSocket connection for real-time updates handled separately