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
        portfolio: {
          total_value: 2540300,
          cumulative_pnl: 91024.18,
          cumulative_return: 0.60,
          annual_return: 0.14,
          max_drawdown: -0.26,
          annual_volatility: 0.38
        },
        positions: [
          {
            symbol: 'Alpha',
            value: 152492,
            change_24h: 2.46,
            sharpe_ratio: 0.54,
            sortino_ratio: 3.10
          },
          {
            symbol: 'Beta',
            value: 182400,
            change_24h: 0.48,
            sharpe_ratio: 0.46,
            sortino_ratio: 2.50
          }
        ],
        performance: {
          dates: ['2023-04', '2023-05', '2023-06'],
          returns: [0.05, 0.08, 0.12],
          cumulative: [1.05, 1.13, 1.27]
        },
        exposure: {
          crypto: 0.25,
          forex: 0.15,
          fixed_income: 0.15,
          commodities: 0.15,
          cash: 0.05,
          private_markets: 0.15,
          equities: 0.10
        },
        news: [
          {
            id: '1',
            title: 'Economic Data',
            description: 'GDP Growth Q3Q4',
            sentiment: 'Extremely Negative',
            timestamp: new Date().toISOString()
          }
        ]
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
    expect(screen.getByText('Cumulative PnL')).toBeInTheDocument()
    expect(screen.getByText('+$91,024.18')).toBeInTheDocument()
    
    expect(screen.getByText('Annual Return')).toBeInTheDocument()
    expect(screen.getByText('+14%')).toBeInTheDocument()
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
      expect(screen.getByText('Economic Data')).toBeInTheDocument()
      expect(screen.getByText('GDP Growth Q3Q4')).toBeInTheDocument()
    })
  })

  it('should display positions table', async () => {
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('Active Positions')).toBeInTheDocument()
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('$152,492')).toBeInTheDocument()
      expect(screen.getByText('$182,400')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading portfolio data/i)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })
})