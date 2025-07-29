import { NextRequest, NextResponse } from 'next/server'

interface SSVISurfaceRequest {
  symbol: string
  theta_model_type?: string
  phi_model_type?: string
  force_recalibrate?: boolean
  k_range?: [number, number]
  k_points?: number
  t_range?: [number, number] 
  t_points?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SSVISurfaceRequest = await request.json()
    
    const {
      symbol,
      theta_model_type = 'power_law',
      phi_model_type = 'heston',
      force_recalibrate = false,
      k_range = [-1.0, 1.0],
      k_points = 50,
      t_range = [0.01, 1.0],
      t_points = 40
    } = body

    // Call Python backend SSVI service
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/volatility/ssvi/surface`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        theta_model_type,
        phi_model_type,
        force_recalibrate,
        k_range,
        k_points,
        t_range,
        t_points
      })
    })

    if (!pythonResponse.ok) {
      throw new Error(`Python API error: ${pythonResponse.statusText}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      surface_data: result.surface_data,
      fit_result: result.fit_result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('SSVI surface API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate SSVI surface',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'BTC-USD'

    // Get cached surface data if available
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/volatility/ssvi/surface/${symbol}`)
    
    if (!pythonResponse.ok) {
      throw new Error(`Python API error: ${pythonResponse.statusText}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      surface_data: result.surface_data,
      fit_result: result.fit_result,
      cached: true,
      timestamp: result.timestamp
    })

  } catch (error) {
    console.error('SSVI surface GET API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve SSVI surface',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}