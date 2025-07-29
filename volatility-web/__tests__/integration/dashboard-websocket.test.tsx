import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import WS from 'jest-websocket-mock'
import DashboardPage from '@/app/page'
import { wsClient } from '@/lib/websocket'

// Mock the AppLayout component
jest.mock('@/components/layout/app-layout', () => {
  return {
    AppLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="app-layout">{children}</div>
    )
  }
})

// Mock the recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />
}))

// Mock fetch to return dashboard data
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      portfolio_summary: {
        total_positions: 4,
        total_value: 174500,
        total_pnl: 9650,
        total_pnl_percentage: 5.86,
        net_delta: 2.55,
        absolute_delta: 4.9,
        gamma: 0.003,
        vega: 19.5,
        theta: -4.8
      },
      portfolio_analytics: {
        portfolio_value: 174500,
        cumulative_pnl: 9650,
        cumulative_return: 5.86,
        annual_return: 12.4,
        max_drawdown: -8.2,
        annual_volatility: 24.5,
        var_95: 8750,
        beta: 0.85,
        alpha: 0.024,
        net_delta: 2.55,
        net_gamma: 0.003,
        net_vega: 19.5,
        net_theta: -4.8
      },
      performance_history: [
        {
          date: '2024-01-01',
          portfolio_value: 165000,
          daily_return: 1.2,
          cumulative_return: 5.8,
          drawdown: -2.1,
          volatility: 25.0,
          benchmark_return: 4.5
        }
      ],
      news_feed: [],
      ai_insights: [],
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
) as jest.Mock

const WS_URL = 'ws://localhost:8765'

describe('Dashboard WebSocket Integration', () => {
  let server: WS

  beforeEach(async () => {
    server = new WS(WS_URL, { jsonProtocol: true })
    wsClient.disconnect()
  })

  afterEach(() => {
    wsClient.disconnect()
    WS.clean()
  })

  it('should display real-time connection status', async () => {
    render(<DashboardPage />)

    // Initially should show offline
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })

    await server.connected

    // Should show live status
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })

  it('should update portfolio metrics in real-time', async () => {
    render(<DashboardPage />)

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('$174,500')).toBeInTheDocument()
    })

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send portfolio update via WebSocket
    act(() => {
      server.send({
        type: 'portfolio_update',
        timestamp: Date.now(),
        data: {
          portfolio_summary: {
            total_positions: 5,
            total_value: 185000,
            total_pnl: 12000,
            total_pnl_percentage: 6.95,
            net_delta: 3.2,
            absolute_delta: 5.8,
            gamma: 0.004,
            vega: 22.1,
            theta: -5.2
          }
        }
      })
    })

    // Should update the displayed values
    await waitFor(() => {
      expect(screen.getByText('$185,000')).toBeInTheDocument()
      expect(screen.getByText('+$12,000')).toBeInTheDocument()
      expect(screen.getByText('+6.9%')).toBeInTheDocument()
    })
  })

  it('should update analytics in real-time', async () => {
    render(<DashboardPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('+12.4%')).toBeInTheDocument()
    })

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send analytics update
    act(() => {
      server.send({
        type: 'portfolio_analytics',
        timestamp: Date.now(),
        data: {
          portfolio_value: 185000,
          cumulative_pnl: 12000,
          cumulative_return: 6.95,
          annual_return: 15.2,
          max_drawdown: -7.8,
          annual_volatility: 22.3,
          var_95: 9250,
          beta: 0.92,
          alpha: 0.031,
          net_delta: 3.2,
          net_gamma: 0.004,
          net_vega: 22.1,
          net_theta: -5.2
        }
      })
    })

    // Should update analytics values
    await waitFor(() => {
      expect(screen.getByText('+15.2%')).toBeInTheDocument()
      expect(screen.getByText('-7.8%')).toBeInTheDocument()
      expect(screen.getByText('22.3%')).toBeInTheDocument()
    })
  })

  it('should display and update AI insights', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send AI insight update
    act(() => {
      server.send({
        type: 'ai_insight',
        timestamp: Date.now(),
        data: {
          insights: [
            {
              id: 'insight-1',
              type: 'opportunity',
              title: 'Volatility arbitrage opportunity',
              description: 'Current implied volatility is trading below historical levels',
              priority: 'high',
              confidence: 0.85,
              suggested_actions: ['Consider long volatility positions'],
              acknowledged: false
            }
          ]
        }
      })
    })

    // Should display the insight
    await waitFor(() => {
      expect(screen.getByText('Volatility arbitrage opportunity')).toBeInTheDocument()
      expect(screen.getByText('Current implied volatility is trading below historical levels')).toBeInTheDocument()
      expect(screen.getByText('high')).toBeInTheDocument()
    })
  })

  it('should display news updates', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send news update
    act(() => {
      server.send({
        type: 'news_update',
        timestamp: Date.now(),
        data: {
          news_feed: [
            {
              id: 'news-1',
              title: 'Bitcoin reaches new highs',
              summary: 'Bitcoin price surged to $52,000 amid institutional buying',
              source: 'CoinDesk',
              timestamp: '2024-01-01T12:00:00Z',
              is_critical: false,
              relevance_score: 0.85
            }
          ]
        }
      })
    })

    // Should display the news item
    await waitFor(() => {
      expect(screen.getByText('Bitcoin reaches new highs')).toBeInTheDocument()
      expect(screen.getByText('Bitcoin price surged to $52,000 amid institutional buying')).toBeInTheDocument()
      expect(screen.getByText('CoinDesk')).toBeInTheDocument()
    })
  })

  it('should update performance metrics', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send performance update
    act(() => {
      server.send({
        type: 'performance_update',
        timestamp: Date.now(),
        data: {
          performance_history: [
            {
              date: '2024-01-02',
              portfolio_value: 180000,
              daily_return: 2.5,
              cumulative_return: 8.0,
              drawdown: -1.8,
              volatility: 23.5,
              benchmark_return: 5.2
            }
          ],
          market_indicators: {
            vix: 16.8,
            btc_iv: 72.1
          }
        }
      })
    })

    // Performance data should be updated (this would affect charts)
    // Since we're mocking recharts, we can't test visual updates directly
    // but the component should receive the new data
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('should show last update time', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send any update
    act(() => {
      server.send({
        type: 'portfolio_update',
        timestamp: Date.now(),
        data: { portfolio_summary: { total_value: 175000 } }
      })
    })

    // Should show last update time
    await waitFor(() => {
      expect(screen.getByText(/Last update:/)).toBeInTheDocument()
    })
  })

  it('should handle WebSocket disconnection gracefully', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Should show live status
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    // Disconnect WebSocket
    act(() => {
      server.close()
    })

    // Should show offline status
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('should handle multiple rapid updates efficiently', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send multiple rapid updates
    for (let i = 0; i < 10; i++) {
      act(() => {
        server.send({
          type: 'portfolio_update',
          timestamp: Date.now() + i,
          data: {
            portfolio_summary: {
              total_value: 175000 + i * 1000
            }
          }
        })
      })
    }

    // Should handle all updates and show the final value
    await waitFor(() => {
      expect(screen.getByText('$184,000')).toBeInTheDocument()
    })
  })
})

describe('Dashboard Update Logic', () => {
  let server: WS

  beforeEach(async () => {
    server = new WS(WS_URL, { jsonProtocol: true })
    wsClient.disconnect()
  })

  afterEach(() => {
    wsClient.disconnect()
    WS.clean()
  })

  it('should handle incremental vs full analytics updates', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send incremental update
    act(() => {
      server.send({
        type: 'portfolio_analytics',
        timestamp: Date.now(),
        data: {
          update_type: 'incremental',
          annual_return: 15.5
        }
      })
    })

    // Should merge with existing data
    await waitFor(() => {
      expect(screen.getByText('+15.5%')).toBeInTheDocument()
      // Other values should remain from initial load
      expect(screen.getByText('0.85')).toBeInTheDocument() // beta
    })

    // Send full update
    act(() => {
      server.send({
        type: 'portfolio_analytics',
        timestamp: Date.now(),
        data: {
          portfolio_value: 200000,
          cumulative_pnl: 15000,
          cumulative_return: 8.1,
          annual_return: 18.2,
          max_drawdown: -6.5,
          beta: 0.95,
          alpha: 0.042
        }
      })
    })

    // Should replace all data
    await waitFor(() => {
      expect(screen.getByText('+18.2%')).toBeInTheDocument()
      expect(screen.getByText('0.95')).toBeInTheDocument() // new beta
    })
  })

  it('should manage AI insights list correctly', async () => {
    render(<DashboardPage />)

    // Connect WebSocket
    act(() => {
      wsClient.connect(WS_URL)
    })
    await server.connected

    // Send first insight
    act(() => {
      server.send({
        type: 'ai_insight',
        timestamp: Date.now(),
        data: {
          insights: [
            {
              id: 'insight-1',
              type: 'opportunity',
              title: 'First insight',
              description: 'Description 1',
              priority: 'high',
              acknowledged: false
            }
          ]
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('First insight')).toBeInTheDocument()
    })

    // Send second insight (should be added to front)
    act(() => {
      server.send({
        type: 'ai_insight',
        timestamp: Date.now(),
        data: {
          insights: [
            {
              id: 'insight-2',
              type: 'risk',
              title: 'Second insight',
              description: 'Description 2',
              priority: 'medium',
              acknowledged: false
            }
          ]
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Second insight')).toBeInTheDocument()
      expect(screen.getByText('First insight')).toBeInTheDocument()
    })

    // Update first insight (should replace existing)
    act(() => {
      server.send({
        type: 'ai_insight',
        timestamp: Date.now(),
        data: {
          insights: [
            {
              id: 'insight-1',
              type: 'opportunity',
              title: 'Updated first insight',
              description: 'Updated description 1',
              priority: 'low',
              acknowledged: true
            }
          ]
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Updated first insight')).toBeInTheDocument()
      expect(screen.queryByText('First insight')).not.toBeInTheDocument()
    })
  })
})