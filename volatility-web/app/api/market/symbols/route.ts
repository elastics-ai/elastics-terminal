import { NextRequest, NextResponse } from 'next/server'

interface MarketSymbol {
  symbol: string
  spot_price: number
  volatility: number
  last_updated: string
  market_cap?: number
  volume_24h?: number
  change_24h?: number
}

export async function GET(request: NextRequest) {
  try {
    // Try to fetch from Python backend first
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/market/symbols`)
    
    if (pythonResponse.ok) {
      const result = await pythonResponse.json()
      return NextResponse.json(result)
    }

    // Fallback to mock data if backend is unavailable
    const mockSymbols: MarketSymbol[] = [
      {
        symbol: 'BTC-USD',
        spot_price: 68500,
        volatility: 0.75,
        last_updated: new Date().toISOString(),
        market_cap: 1350000000000,
        volume_24h: 25000000000,
        change_24h: 2.5
      },
      {
        symbol: 'ETH-USD', 
        spot_price: 3850,
        volatility: 0.85,
        last_updated: new Date().toISOString(),
        market_cap: 460000000000,
        volume_24h: 15000000000,
        change_24h: 1.8
      },
      {
        symbol: 'SOL-USD',
        spot_price: 185,
        volatility: 0.95,
        last_updated: new Date().toISOString(),
        market_cap: 85000000000,
        volume_24h: 2500000000,
        change_24h: -0.5
      },
      {
        symbol: 'SPY',
        spot_price: 445,
        volatility: 0.18,
        last_updated: new Date().toISOString(),
        market_cap: 450000000000,
        volume_24h: 50000000000,
        change_24h: 0.3
      },
      {
        symbol: 'QQQ',
        spot_price: 385,
        volatility: 0.22,
        last_updated: new Date().toISOString(),
        market_cap: 220000000000,
        volume_24h: 35000000000,
        change_24h: 0.8
      },
      {
        symbol: 'TSLA',
        spot_price: 250,
        volatility: 0.45,
        last_updated: new Date().toISOString(),
        market_cap: 800000000000,
        volume_24h: 15000000000,
        change_24h: -1.2
      }
    ]

    return NextResponse.json(mockSymbols)

  } catch (error) {
    console.error('Market symbols API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market symbols',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body

    if (!Array.isArray(symbols)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbols must be an array'
        },
        { status: 400 }
      )
    }

    // Call Python backend to fetch specific symbols
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/market/symbols/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols })
    })

    if (!pythonResponse.ok) {
      throw new Error(`Python API error: ${pythonResponse.statusText}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      symbols: result.symbols,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Market symbols batch API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch symbol batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}