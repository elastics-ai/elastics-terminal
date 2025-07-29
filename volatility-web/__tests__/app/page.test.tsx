import React from 'react'
import { render, screen, waitFor } from '@/test-utils/render'
import { MockWebSocket } from '@/test-utils/websocket-mock'
import HomePage from '@/app/page'
import '@testing-library/jest-dom'

// Mock the WebSocket
global.WebSocket = MockWebSocket as any

// Mock the fetch API
global.fetch = jest.fn()

// Mock the websocket hook
jest.mock('@/lib/websocket', () => ({
  useWebSocket: jest.fn(() => ({
    socket: null,
    isConnected: false
  }))
}))

describe('Portfolio Overview Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        portfolio_summary: {
          total_positions: 4,
          total_value: 2540300,
          total_pnl: 91024.18,
          total_pnl_percentage: 6.0,
          net_delta: 2.55,
          absolute_delta: 4.9,
          gamma: 0.003,
          vega: 19.5,
          theta: -4.8
        },
        portfolio_analytics: {
          portfolio_value: 2540300,
          cumulative_pnl: 91024.18,
          cumulative_return: 60.0,
          annual_return: 14.0,
          max_drawdown: -26.0,
          annual_volatility: 38.0,
          active_strategies: 1,
          var_95: 8750,
          cvar_95: 12300,
          beta: 0.85,
          alpha: 0.024,
          net_delta: 2.55,
          net_gamma: 0.003,
          net_vega: 19.5,
          net_theta: -4.8
        },
        performance_history: [
          {
            date: '2023-04-01T00:00:00Z',
            portfolio_value: 2450000,
            daily_return: 0.5,
            cumulative_return: 50.0,
            drawdown: -2.0,
            volatility: 35.0,
            benchmark_return: 45.0
          }
        ],
        news_feed: [
          {
            id: '1',
            title: 'Economic Data Update',
            summary: 'GDP Growth Q3Q4 showing positive trends',
            source: 'Economic Data',
            relevance_score: 0.85,
            symbols: ['SPX', 'BTC'],
            timestamp: new Date().toISOString(),
            is_critical: false
          }
        ],
        ai_insights: [
          {
            id: 'insight_1',
            type: 'risk',
            title: 'Portfolio risk exposure elevated',
            description: 'Consider reducing position sizes',
            confidence: 0.85,
            priority: 'medium',
            suggested_actions: ['Reduce BTC positions'],
            related_positions: ['BTC'],
            acknowledged: false
          }
        ],
        asset_allocation: {
          'BTC': 45.2,
          'ETH': 32.1,
          'Options': 15.7,
          'Cash': 7.0
        },
        strategy_allocation: {
          'Strategy-Alpha-01': 60.0,
          'Direct Positions': 40.0
        },
        market_indicators: {
          vix: 18.5,
          btc_iv: 75.2
        }
      })
    })
  })

  it('should render portfolio overview with key metrics', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    })

    // Check portfolio value card
    await waitFor(() => {
      expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
      expect(screen.getByText('$2,540,300')).toBeInTheDocument()
    })

    // Check other metric cards
    expect(screen.getByText('Cumulative P&L')).toBeInTheDocument()
    expect(screen.getAllByText('+$91,024.18')).toHaveLength(2) // Should appear in multiple places
    
    expect(screen.getByText('Annual Return')).toBeInTheDocument()
    expect(screen.getByText('+14.0%')).toBeInTheDocument()
  })

  it('should display portfolio exposure chart', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('Portfolio Exposure')).toBeInTheDocument()
    })
  })

  it('should show news feed', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('News Feed')).toBeInTheDocument()
      expect(screen.getByText('Economic Data Update')).toBeInTheDocument()
      expect(screen.getByText('GDP Growth Q3Q4 showing positive trends')).toBeInTheDocument()
    })
  })

  it('should display AI insights', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('AI Suggestions')).toBeInTheDocument()
      expect(screen.getByText('Portfolio risk exposure elevated')).toBeInTheDocument()
      expect(screen.getByText('Consider reducing position sizes')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    render(<HomePage />)

    // Should fall back to mock data when API fails
    await waitFor(() => {
      expect(screen.getAllByText('Portfolio Overview')).toHaveLength(2) // Header + main content
      // Mock data should be displayed instead of error
      expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
    })
  })
})