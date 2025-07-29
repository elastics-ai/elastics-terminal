import { NextRequest, NextResponse } from 'next/server'

interface SSVICalibrationRequest {
  symbol: string
  theta_model_type?: string
  phi_model_type?: string
  spot: number
  risk_free_rate?: number
  dividend_yield?: number
  initial_params?: number[]
  bounds?: Array<[number, number]>
  use_butterfly_constraints?: boolean
  use_calendar_constraints?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: SSVICalibrationRequest = await request.json()
    
    const {
      symbol,
      theta_model_type = 'power_law',
      phi_model_type = 'heston',
      spot,
      risk_free_rate = 0.02,
      dividend_yield = 0.0,
      initial_params,
      bounds,
      use_butterfly_constraints = true,
      use_calendar_constraints = true
    } = body

    // Validate required parameters
    if (!symbol || !spot) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol and spot price are required'
        },
        { status: 400 }
      )
    }

    // Call Python backend SSVI calibration service
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/volatility/ssvi/calibrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        theta_model_type,
        phi_model_type,
        spot,
        risk_free_rate,
        dividend_yield,
        initial_params,
        bounds,
        use_butterfly_constraints,
        use_calendar_constraints
      })
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}))
      throw new Error(`Python API error: ${pythonResponse.statusText}. ${errorData.detail || ''}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      fit_result: result.fit_result,
      calibration_metrics: {
        rmse: result.fit_result.fit_quality.rmse,
        r_squared: result.fit_result.fit_quality.r_squared,
        max_error: result.fit_result.fit_quality.max_error,
        converged: result.fit_result.fit_quality.converged,
        data_points: result.fit_result.fit_quality.data_points
      },
      parameters: result.fit_result.parameters,
      arbitrage_free: result.arbitrage_check?.overall_arbitrage_free || false,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('SSVI calibration API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calibrate SSVI surface',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol parameter is required'
        },
        { status: 400 }
      )
    }

    // Get latest calibration results
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/volatility/ssvi/calibration/${symbol}`)
    
    if (!pythonResponse.ok) {
      throw new Error(`Python API error: ${pythonResponse.statusText}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('SSVI calibration GET API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve calibration results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}