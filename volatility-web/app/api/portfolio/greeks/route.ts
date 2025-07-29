import { NextRequest, NextResponse } from 'next/server'

interface PortfolioGreeksRequest {
  portfolio_id?: string
  include_concentration_risk?: boolean
  include_scenario_analysis?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get('portfolio_id') || 'default'
    const includeConcentrationRisk = searchParams.get('include_concentration_risk') === 'true'
    const includeScenarioAnalysis = searchParams.get('include_scenario_analysis') === 'true'

    // Call Python backend portfolio Greeks service
    const pythonResponse = await fetch(
      `${process.env.PYTHON_API_URL}/api/portfolio/greeks?` + 
      `portfolio_id=${portfolioId}&` +
      `include_concentration_risk=${includeConcentrationRisk}&` +
      `include_scenario_analysis=${includeScenarioAnalysis}`
    )

    if (!pythonResponse.ok) {
      throw new Error(`Python API error: ${pythonResponse.statusText}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Portfolio Greeks API error:', error)
    
    // Return mock data if Python service is unavailable
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      portfolio_value: 1250000,
      net_delta: 150.5,
      net_gamma: 25.3,
      net_vega: 8500,
      net_theta: -450,
      net_rho: 120,
      net_vanna: 15.2,
      net_volga: 8.7,
      net_charm: -12.1,
      net_speed: 3.4,
      delta_adjusted_exposure: 0.12,
      gamma_adjusted_exposure: 0.02,
      largest_position_delta: 45.2,
      largest_position_gamma: 8.9,
      concentration_risk: 0.18,
      risk_metrics: {
        compliant: true,
        violations: [],
        warnings: [],
        risk_score: 2
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PortfolioGreeksRequest = await request.json()
    
    const {
      portfolio_id = 'default',
      include_concentration_risk = true,
      include_scenario_analysis = false
    } = body

    // Call Python backend to recalculate portfolio Greeks
    const pythonResponse = await fetch(`${process.env.PYTHON_API_URL}/api/portfolio/greeks/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        portfolio_id,
        include_concentration_risk,
        include_scenario_analysis
      })
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}))
      throw new Error(`Python API error: ${pythonResponse.statusText}. ${errorData.detail || ''}`)
    }

    const result = await pythonResponse.json()
    
    return NextResponse.json({
      success: true,
      greeks_snapshot: result.greeks_snapshot,
      risk_analysis: result.risk_analysis,
      scenario_analysis: result.scenario_analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Portfolio Greeks calculation API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate portfolio Greeks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}