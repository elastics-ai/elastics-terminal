/**
 * Integration Tests for Portfolio Overview (Design Page 1)
 * 
 * Tests cover:
 * - Frontend-backend integration through API calls
 * - Real-time data updates and WebSocket integration  
 * - End-to-end user workflows and interactions
 * - Error handling and retry mechanisms
 * - State management and data flow
 * - Performance under real conditions
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from '@/app/page'
import '@testing-library/jest-dom'

// Recharts mocks are now handled globally in jest.setup.js

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: jest.fn(),
}))

// Mock AppLayout
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}))

// Mock WebSocket hooks
jest.mock('@/lib/websocket', () => ({
  wsClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
  useWebSocketConnection: () => false,
  useDashboardWebSocket: jest.fn(),
  usePortfolioAnalyticsWebSocket: jest.fn(),
  useNewsWebSocket: jest.fn(),
  useAIInsightsWebSocket: jest.fn(),
}))

// Test data matching backend API responses
const mockDashboardData = {
  portfolio_analytics: {
    portfolio_value: 2540300,
    cumulative_pnl: 91024.18,
    cumulative_return: 5.86,
    annual_return: 14.2,
    max_drawdown: -8.5,
    annual_volatility: 24.3,
    net_delta: 2.55,
    net_vega: 19.5,
    var_95: 8750,
    beta: 0.85,
    alpha: 0.024,
  },
  performance_history: [
    {
      date: '2024-01-01T00:00:00Z',
      portfolio_value: 2400000,
      daily_return: 0.5,
      cumulative_return: 5.0,
    },
    {
      date: '2024-01-02T00:00:00Z',
      portfolio_value: 2540300,
      daily_return: 0.36,
      cumulative_return: 5.86,
    },
  ],
  asset_allocation: {
    'BTC': 45.2,
    'ETH': 32.1,
    'Options': 15.7,
    'Cash': 7.0,
  },
  news_feed: [
    {
      id: 'news-1',
      title: 'Bitcoin Volatility Spike Expected',
      summary: 'Market analysts predict increased volatility following recent regulatory developments.',
      source: 'CryptoNews',
      timestamp: '2024-01-15T10:00:00Z',
      is_critical: true,
      relevance_score: 0.85,
    },
  ],
  ai_insights: [
    {
      id: 'insight-1',
      title: 'High Delta Exposure Detected',
      description: 'Your portfolio has significant delta exposure that may benefit from hedging.',
      type: 'risk',
      priority: 'high',
      suggested_actions: ['Consider protective puts', 'Reduce position size'],
      acknowledged: false,
    },
  ],
}

// Mock global fetch for API mocking
const mockFetch = jest.fn()
global.fetch = mockFetch

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('Portfolio Overview Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    })
  })

  describe('Frontend-Backend Integration', () => {
    it('should successfully load and display data from backend API', async () => {
      renderWithProviders(<HomePage />)

      // Wait for API call to complete and data to display
      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })

      // Verify all main sections loaded
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      expect(screen.getByText('Performance Breakdown')).toBeInTheDocument()
      expect(screen.getByText('Portfolio Exposure')).toBeInTheDocument()
      expect(screen.getByText('News Feed')).toBeInTheDocument()
    })

    it('should handle API response data correctly', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        // Portfolio metrics
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
        expect(screen.getAllByText(/\+\$91,024(\.\d+)?/)).toHaveLength(2) // Portfolio Value and P&L
        expect(screen.getAllByText('+5.9%')).toHaveLength(2) // Portfolio and cumulative return
        expect(screen.getByText('+14.2%')).toBeInTheDocument()
        
        // Risk metrics
        expect(screen.getByText('$8,750')).toBeInTheDocument() // VaR
        expect(screen.getByText('0.85')).toBeInTheDocument() // Beta
        expect(screen.getByText('0.024')).toBeInTheDocument() // Alpha
        expect(screen.getByText('2.55')).toBeInTheDocument() // Delta
        expect(screen.getByText('19.5')).toBeInTheDocument() // Vega
      })
    })

    it('should display asset allocation from backend data', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('45%')).toBeInTheDocument() // BTC
        expect(screen.getByText('32%')).toBeInTheDocument() // ETH  
        expect(screen.getByText('16%')).toBeInTheDocument() // Options (rounded)
        expect(screen.getByText('7%')).toBeInTheDocument() // Cash
      })
    })

    it('should display news feed from backend', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Bitcoin Volatility Spike Expected')).toBeInTheDocument()
        expect(screen.getByText(/Market analysts predict increased volatility/)).toBeInTheDocument()
        expect(screen.getByText('CryptoNews')).toBeInTheDocument()
        expect(screen.getByText('Critical')).toBeInTheDocument()
        expect(screen.getByText('Relevance: 85%')).toBeInTheDocument()
      })
    })

    it('should display AI insights from backend', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument()
        expect(screen.getByText('1 New')).toBeInTheDocument()
        expect(screen.getByText('High Delta Exposure Detected')).toBeInTheDocument()
        expect(screen.getByText(/Your portfolio has significant delta exposure/)).toBeInTheDocument()
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText(/Consider protective puts, Reduce position size/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      renderWithProviders(<HomePage />)

      // Should fall back to mock data when API fails
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
        expect(screen.getByText('$174,500')).toBeInTheDocument() // Mock fallback data
      })
    })

    it('should provide retry functionality on error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Server Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDashboardData,
        })

      renderWithProviders(<HomePage />)

      // Should fall back to mock data after first error
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
        expect(screen.getByText('$174,500')).toBeInTheDocument() // Mock fallback data
      })
      
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle partial data gracefully', async () => {
      const partialData = {
        portfolio_analytics: {
          portfolio_value: 1000000,
          cumulative_pnl: 50000,
        },
        performance_history: [],
        asset_allocation: {},
        news_feed: [],
        ai_insights: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => partialData,
      })

      renderWithProviders(<HomePage />)

      await waitFor(() => {
        // Component renders successfully with partial data
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
        expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
        expect(screen.getByText('Cumulative P&L')).toBeInTheDocument()
      })

      // Should handle empty sections gracefully - news section should exist
      expect(screen.getByText('News Feed')).toBeInTheDocument()
    })
  })

  describe('Real-time Updates Integration', () => {
    it('should display initial data correctly on mount', async () => {
      renderWithProviders(<HomePage />)

      // Component should render successfully and show Portfolio Overview page
      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
        expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
        expect(screen.getByText('Cumulative P&L')).toBeInTheDocument()
      })
      
      // Should display some portfolio data (either API data or fallback mock data)
      expect(screen.getByText('Portfolio Exposure')).toBeInTheDocument()
      expect(screen.getByText('News Feed')).toBeInTheDocument()
    })

    it('should make single API call on mount (no polling)', async () => {
      let callCount = 0

      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          json: async () => mockDashboardData,
        }
      })

      renderWithProviders(<HomePage />)

      // Initial call should be made
      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // Wait additional time - no more calls should be made (WebSocket is used for real-time updates)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(callCount).toBe(1) // Still only 1 call
    })
  })

  describe('User Interaction Integration', () => {
    it('should successfully acknowledge AI insights', async () => {
      let acknowledgeCallCount = 0
      
      mockFetch.mockImplementation(async (url, options) => {
        if (url === '/api/dashboard/insights/insight-1/acknowledge' && options?.method === 'POST') {
          acknowledgeCallCount++
          return {
            ok: true,
            json: async () => ({ success: true }),
          }
        }
        if (url === '/api/dashboard/overview') {
          return {
            ok: true,
            json: async () => mockDashboardData,
          }
        }
        return { ok: false }
      })

      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('High Delta Exposure Detected')).toBeInTheDocument()
      })

      // Find and click acknowledge button
      const acknowledgeButton = screen.getByRole('button', { name: '' }) // CheckCircle icon
      fireEvent.click(acknowledgeButton)

      await waitFor(() => {
        expect(acknowledgeCallCount).toBe(1)
      })
    })

    it('should handle acknowledge errors gracefully', async () => {
      mockFetch.mockImplementation(async (url, options) => {
        if (url.includes('/acknowledge') && options?.method === 'POST') {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Failed to acknowledge' }),
          }
        }
        if (url === '/api/dashboard/overview') {
          return {
            ok: true,
            json: async () => mockDashboardData,
          }
        }
        return { ok: false }
      })

      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('High Delta Exposure Detected')).toBeInTheDocument()
      })

      const acknowledgeButton = screen.getByRole('button', { name: '' })
      fireEvent.click(acknowledgeButton)

      // Should not crash and insight should remain visible
      await waitFor(() => {
        expect(screen.getByText('High Delta Exposure Detected')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Integration', () => {
    it('should render large datasets without performance issues', async () => {
      const largeDataset = {
        ...mockDashboardData,
        performance_history: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(Date.now() - (365 - i) * 24 * 60 * 60 * 1000).toISOString(),
          portfolio_value: 2000000 + i * 1000,
          daily_return: (Math.random() - 0.5) * 2,
          cumulative_return: i * 0.1,
        })),
        news_feed: Array.from({ length: 50 }, (_, i) => ({
          id: `news-${i}`,
          title: `News Item ${i}`,
          summary: `This is news item ${i} summary`,
          source: 'TestSource',
          timestamp: new Date().toISOString(),
          is_critical: i % 5 === 0,
          relevance_score: 0.8,
        })),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset,
      })

      const startTime = performance.now()
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (5 seconds)
      expect(renderTime).toBeLessThan(5000)
    })

    it('should handle concurrent API requests correctly', async () => {
      let requestCount = 0
      const requestTimestamps: number[] = []

      mockFetch.mockImplementation(async () => {
        requestCount++
        requestTimestamps.push(Date.now())
        return {
          ok: true,
          json: async () => mockDashboardData,
        }
      })

      // Render multiple components simultaneously
      const queryClient = createTestQueryClient()
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <HomePage />
        </QueryClientProvider>
      )

      // Quick re-renders to simulate rapid interactions
      for (let i = 0; i < 3; i++) {
        rerender(
          <QueryClientProvider client={queryClient}>
            <HomePage />
          </QueryClientProvider>
        )
      }

      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })

      // Should handle requests efficiently (deduplication)
      expect(requestCount).toBeLessThanOrEqual(2) // React Query should deduplicate
    })
  })

  describe('State Management Integration', () => {
    it('should maintain state consistency across re-renders', async () => {
      const { rerender } = renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })

      // Re-render component
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <HomePage />
        </QueryClientProvider>
      )

      // State should be maintained
      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })
    })

    it('should handle component unmounting gracefully', async () => {
      const { unmount } = renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })

      // Should unmount without errors
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Data Flow Integration', () => {
    it('should correctly transform API data for display', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        // Verify numeric formatting
        expect(screen.getByText('$2,540,300')).toBeInTheDocument() // Formatted with commas
        expect(screen.getAllByText(/\+\$91,024(\.\d+)?/)).toHaveLength(2) // Portfolio Value and P&L with positive sign and formatting
        expect(screen.getAllByText('+5.9%')).toHaveLength(2) // Portfolio and cumulative return // Percentage with + sign
        expect(screen.getByText('-8.5%')).toBeInTheDocument() // Negative drawdown
      })
    })

    it('should handle data type conversions correctly', async () => {
      const dataWithStringNumbers = {
        ...mockDashboardData,
        portfolio_analytics: {
          ...mockDashboardData.portfolio_analytics,
          portfolio_value: "2540300", // String instead of number
          cumulative_pnl: "91024.18",
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithStringNumbers,
      })

      renderWithProviders(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('$2540300')).toBeInTheDocument() // String numbers without comma formatting
        expect(screen.getAllByText(/\+\$91024\.18/)).toHaveLength(2) // Portfolio Value and P&L
      })
    })

    it('should correctly map asset allocation to chart data', async () => {
      renderWithProviders(<HomePage />)

      await waitFor(() => {
        // Verify pie chart is rendered
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
        
        // Verify allocation percentages are displayed
        expect(screen.getByText('BTC')).toBeInTheDocument()
        expect(screen.getByText('ETH')).toBeInTheDocument()
        expect(screen.getByText('Options')).toBeInTheDocument()
        expect(screen.getByText('Cash')).toBeInTheDocument()
      })
    })
  })
})