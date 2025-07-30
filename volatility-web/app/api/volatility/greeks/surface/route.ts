import { NextRequest, NextResponse } from 'next/server'

interface GreeksSurfaceRequest {
  spot: number
  strike_range: [number, number]
  expiry_range: [number, number] // in years
  volatility: number
  risk_free_rate?: number
  dividend_yield?: number
  n_strikes?: number
  n_expiries?: number
  greek: 'delta' | 'gamma' | 'vega' | 'theta' | 'rho' | 'vanna' | 'volga' | 'charm' | 'speed' | 'color' | 'zomma'
  option_type: 'call' | 'put'
}

export async function POST(request: NextRequest) {
  try {
    const body: GreeksSurfaceRequest = await request.json()
    
    const {
      spot,
      strike_range,
      expiry_range,
      volatility,
      risk_free_rate = 0.02,
      dividend_yield = 0.0,
      n_strikes = 25,
      n_expiries = 20,
      greek = 'delta',
      option_type = 'call'
    } = body

    // Validate required parameters
    if (!spot || !strike_range || !expiry_range || !volatility) {
      return NextResponse.json(
        {
          success: false,
          error: 'Spot, strike_range, expiry_range, and volatility are required'
        },
        { status: 400 }
      )
    }

    // Call Python backend Greeks service
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/volatility/greeks/surface`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spot,
        strike_range,
        expiry_range,
        volatility,
        risk_free_rate,
        dividend_yield,
        n_strikes,
        n_expiries,
        greek,
        option_type
      })
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}))
      throw new Error(`Python API error: ${pythonResponse.statusText}. ${errorData.detail || ''}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      strikes: result.strikes,
      expiries: result.expiries,
      surface: result.surface,
      greek: result.greek,
      option_type: result.option_type,
      spot: result.spot,
      volatility: result.volatility,
      metadata: {
        n_strikes,
        n_expiries,
        strike_range,
        expiry_range,
        risk_free_rate,
        dividend_yield
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Greeks surface API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Greeks surface',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const spot = parseFloat(searchParams.get('spot') || '50000')
    const volatility = parseFloat(searchParams.get('volatility') || '0.8')
    const greek = searchParams.get('greek') || 'delta'
    const optionType = searchParams.get('option_type') || 'call'

    // Generate default Greeks surface
    const defaultRequest: GreeksSurfaceRequest = {
      spot,
      strike_range: [spot * 0.8, spot * 1.2],
      expiry_range: [7/365, 365/365], // 7 days to 1 year
      volatility,
      greek: greek as GreeksSurfaceRequest['greek'],
      option_type: optionType as GreeksSurfaceRequest['option_type']
    }

    // Call the POST endpoint with default parameters
    const response = await fetch(`${request.url.split('?')[0]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(defaultRequest)
    })

    return response

  } catch (error) {
    console.error('Greeks surface GET API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve Greeks surface',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}