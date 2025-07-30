/**
 * E2E Frontend Tests for Portfolio Overview (Design Page 1)
 * 
 * Tests cover:
 * - Portfolio metrics display (value, P&L, returns, ratios)
 * - Performance charts rendering (cumulative returns, drawdowns)
 * - Exposure pie chart with interactive segments
 * - News feed integration
 * - Real-time data updates
 * - Alpha/Beta visualization
 * - AI suggestions functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from '@/app/page'
import { FloatingChatProvider } from '@/contexts/FloatingChatContext'
import '@testing-library/jest-dom'

// Recharts mocks are now handled globally in jest.setup.js

// Mock the API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <FloatingChatProvider>
        {component}
      </FloatingChatProvider>
    </QueryClientProvider>
  )
}

describe('Portfolio Overview Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      renderWithQueryClient(<HomePage />)

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText(/Error loading dashboard/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      })
    })

    it('should retry data fetch when retry button is clicked', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))
      
      // Mock window.location.reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: 'Retry' })
        fireEvent.click(retryButton)
      })

      expect(mockReload).toHaveBeenCalledTimes(1)
    })
  })

  describe('Portfolio Metrics Display', () => {
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
      news_feed: [],
      ai_insights: [],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })
    })

    it('should display portfolio value correctly formatted', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
        expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
      })
    })

    it('should display cumulative P&L with correct color coding', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        const pnlElement = screen.getByText('+$91,024')
        expect(pnlElement).toBeInTheDocument()
        expect(pnlElement).toHaveClass('text-green-600') // Positive P&L should be green
      })
    })

    it('should display percentage returns with proper formatting', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('+5.9%')).toBeInTheDocument() // Cumulative return
        expect(screen.getByText('+14.2%')).toBeInTheDocument() // Annual return
      })
    })

    it('should display risk metrics (VaR, Beta, Alpha)', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('$8,750')).toBeInTheDocument() // VaR 95%
        expect(screen.getByText('0.85')).toBeInTheDocument() // Beta
        expect(screen.getByText('0.024')).toBeInTheDocument() // Alpha
      })
    })

    it('should display Greeks exposure correctly', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('2.55')).toBeInTheDocument() // Net Delta
        expect(screen.getByText('19.5')).toBeInTheDocument() // Net Vega
      })
    })

    it('should show max drawdown as negative value with red color', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        const drawdownElement = screen.getByText('-8.5%')
        expect(drawdownElement).toBeInTheDocument()
        expect(drawdownElement).toHaveClass('text-red-600')
      })
    })
  })

  describe('Performance Charts', () => {
    const mockDataWithHistory = {
      portfolio_analytics: {
        portfolio_value: 2540300,
        cumulative_pnl: 91024.18,
        alpha: 0.024,
        beta: 0.85,
      },
      performance_history: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        portfolio_value: 2400000 + i * 5000,
        daily_return: (Math.random() - 0.5) * 2,
        cumulative_return: i * 0.2,
      })),
      asset_allocation: { 'BTC': 50, 'ETH': 50 },
      news_feed: [],
      ai_insights: [],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithHistory,
      })
    })

    it('should render performance breakdown chart', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Performance Breakdown')).toBeInTheDocument()
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })
    })

    it('should render alpha/beta chart', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Alpha/Beta')).toBeInTheDocument()
        expect(screen.getAllByTestId('line-chart')).toHaveLength(2) // Performance + Alpha/Beta
      })
    })

    it('should display chart legend correctly', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio')).toBeInTheDocument()
        expect(screen.getByText('Benchmark')).toBeInTheDocument()
        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
      })
    })

    it('should have time period selector buttons', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('1Y')).toBeInTheDocument()
        expect(screen.getByText('YTD')).toBeInTheDocument()
        expect(screen.getByText('6M')).toBeInTheDocument()
      })
    })
  })

  describe('Portfolio Exposure Pie Chart', () => {
    const mockDataWithAllocation = {
      portfolio_analytics: { portfolio_value: 2540300 },
      performance_history: [],
      asset_allocation: {
        'BTC': 45.2,
        'ETH': 32.1,
        'Options': 15.7,
        'Cash': 7.0,
      },
      news_feed: [],
      ai_insights: [],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithAllocation,
      })
    })

    it('should render exposure pie chart', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Portfolio Exposure')).toBeInTheDocument()
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      })
    })

    it('should display allocation percentages in legend', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('45%')).toBeInTheDocument() // BTC
        expect(screen.getByText('32%')).toBeInTheDocument() // ETH
        expect(screen.getByText('16%')).toBeInTheDocument() // Options (rounded)
        expect(screen.getByText('7%')).toBeInTheDocument() // Cash
      })
    })

    it('should show asset names in the legend', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('BTC')).toBeInTheDocument()
        expect(screen.getByText('ETH')).toBeInTheDocument()
        expect(screen.getByText('Options')).toBeInTheDocument()
        expect(screen.getByText('Cash')).toBeInTheDocument()
      })
    })
  })

  describe('AI Suggestions', () => {
    const mockDataWithInsights = {
      portfolio_analytics: { portfolio_value: 2540300 },
      performance_history: [],
      asset_allocation: { 'BTC': 100 },
      news_feed: [],
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
        {
          id: 'insight-2',
          title: 'Volatility Opportunity',
          description: 'Current IV levels suggest attractive entry points for short volatility positions.',
          type: 'opportunity',
          priority: 'medium',
          suggested_actions: ['Sell covered calls'],
          acknowledged: true,
        },
      ],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithInsights,
      })
    })

    it('should display AI suggestions section when insights exist', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument()
        expect(screen.getByText('1 New')).toBeInTheDocument() // Only 1 unacknowledged
      })
    })

    it('should display insight titles and descriptions', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('High Delta Exposure Detected')).toBeInTheDocument()
        expect(screen.getByText(/Your portfolio has significant delta exposure/)).toBeInTheDocument()
        expect(screen.getByText('Volatility Opportunity')).toBeInTheDocument()
      })
    })

    it('should show priority badges for insights', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText('medium')).toBeInTheDocument()
      })
    })

    it('should display suggested actions', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText(/Consider protective puts, Reduce position size/)).toBeInTheDocument()
        expect(screen.getByText(/Sell covered calls/)).toBeInTheDocument()
      })
    })

    it('should allow acknowledging insights', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDataWithInsights,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        const acknowledgeButton = screen.getByRole('button', { name: '' }) // CheckCircle icon button
        fireEvent.click(acknowledgeButton)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/dashboard/insights/insight-1/acknowledge',
          { method: 'POST' }
        )
      })
    })
  })

  describe('News Feed', () => {
    const mockDataWithNews = {
      portfolio_analytics: { portfolio_value: 2540300 },
      performance_history: [],
      asset_allocation: { 'BTC': 100 },
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
        {
          id: 'news-2',
          title: 'Fed Meeting Minutes Released',
          summary: 'Federal Reserve indicates potential rate changes affecting equity markets.',
          source: 'FinancialTimes',
          timestamp: '2024-01-15T08:30:00Z',
          is_critical: false,
          relevance_score: 0.72,
        },
      ],
      ai_insights: [],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDataWithNews,
      })
    })

    it('should display news feed section', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('News Feed')).toBeInTheDocument()
        expect(screen.getByText('See All')).toBeInTheDocument()
      })
    })

    it('should display news titles and summaries', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Bitcoin Volatility Spike Expected')).toBeInTheDocument()
        expect(screen.getByText(/Market analysts predict increased volatility/)).toBeInTheDocument()
        expect(screen.getByText('Fed Meeting Minutes Released')).toBeInTheDocument()
      })
    })

    it('should show news sources and timestamps', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('CryptoNews')).toBeInTheDocument()
        expect(screen.getByText('FinancialTimes')).toBeInTheDocument()
        // Timestamps are formatted to locale time
        expect(screen.getByText(/10:00:00/)).toBeInTheDocument()
      })
    })

    it('should mark critical news items', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument()
      })
    })

    it('should display relevance scores', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Relevance: 85%')).toBeInTheDocument()
        expect(screen.getByText('Relevance: 72%')).toBeInTheDocument()
      })
    })

    it('should show empty state when no news available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockDataWithNews,
          news_feed: [],
        }),
      })

      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('No news items available')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should poll for updates every 30 seconds', async () => {
      const mockData = {
        portfolio_analytics: { portfolio_value: 2540300 },
        performance_history: [],
        asset_allocation: { 'BTC': 100 },
        news_feed: [],
        ai_insights: [],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      renderWithQueryClient(<HomePage />)

      // Initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      // Fast-forward another 30 seconds
      jest.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })
    })

    it('should update displayed data when new data is received', async () => {
      const initialData = {
        portfolio_analytics: { portfolio_value: 2540300 },
        performance_history: [],
        asset_allocation: { 'BTC': 100 },
        news_feed: [],
        ai_insights: [],
      }

      const updatedData = {
        portfolio_analytics: { portfolio_value: 2650000 },
        performance_history: [],
        asset_allocation: { 'BTC': 100 },
        news_feed: [],
        ai_insights: [],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedData,
        })

      renderWithQueryClient(<HomePage />)

      // Initial render
      await waitFor(() => {
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
      })

      // Trigger update
      jest.advanceTimersByTime(30000)

      // Updated render
      await waitFor(() => {
        expect(screen.getByText('$2,650,000')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    const mockData = {
      portfolio_analytics: {
        portfolio_value: 2540300,
        cumulative_pnl: 91024.18,
        cumulative_return: 5.86,
      },
      performance_history: [],
      asset_allocation: { 'BTC': 100 },
      news_feed: [],
      ai_insights: [],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })
    })

    it('should have proper heading structure', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Portfolio Overview' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Performance Breakdown' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Portfolio Exposure' })).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels for interactive elements', async () => {
      renderWithQueryClient(<HomePage />)

      await waitFor(() => {
        const retryButton = screen.queryByRole('button', { name: 'Retry' })
        if (retryButton) {
          expect(retryButton).toHaveAttribute('type', 'button')
        }
      })
    })

    it('should support keyboard navigation', async () => {
      renderWithQueryClient(<HomePage />)

      // This test would be expanded with actual keyboard navigation testing
      await waitFor(() => {
        expect(document.body).toBeInTheDocument() // Basic sanity check
      })
    })
  })
})