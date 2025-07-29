import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PortfolioPage from '@/app/portfolio/page'
import { portfolioAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  portfolioAPI: {
    getOverview: jest.fn(),
    getPerformance: jest.fn(),
    getAllocation: jest.fn(),
    getPositions: jest.fn(),
    getNewsFeed: jest.fn(),
    getAISuggestions: jest.fn(),
  },
}))

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

const mockPortfolioAPI = portfolioAPI as jest.Mocked<typeof portfolioAPI>

describe('PortfolioPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PortfolioPage />
      </QueryClientProvider>
    )
  }

  describe('Overview Section', () => {
    it('should display portfolio overview metrics', async () => {
      mockPortfolioAPI.getOverview.mockResolvedValue({
        total_value: 2540300,
        total_pnl: 61024,
        total_pnl_percent: 2.46,
        cumulative_return: 15.3,
        sharpe_ratio: 1.82,
        max_drawdown: -8.5,
        winning_rate: 0.67,
        total_trades: 156,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument()
        expect(screen.getByText('$2,540,300')).toBeInTheDocument()
        expect(screen.getByText('+$61,024')).toBeInTheDocument()
        expect(screen.getByText('+2.46%')).toBeInTheDocument()
      })
    })

    it('should handle loading state', () => {
      mockPortfolioAPI.getOverview.mockImplementation(() => new Promise(() => {}))

      renderComponent()

      expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
    })

    it('should handle error state', async () => {
      mockPortfolioAPI.getOverview.mockRejectedValue(new Error('API Error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Error loading portfolio data/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance Chart', () => {
    it('should display performance chart with data', async () => {
      mockPortfolioAPI.getPerformance.mockResolvedValue({
        data: [
          { timestamp: '2023-12-01', value: 2400000, pnl: 0 },
          { timestamp: '2023-12-02', value: 2450000, pnl: 50000 },
          { timestamp: '2023-12-03', value: 2540300, pnl: 90300 },
        ],
        stats: {
          best_day: { date: '2023-12-03', pnl: 90300 },
          worst_day: { date: '2023-12-01', pnl: -10000 },
          volatility: 0.023,
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Portfolio Performance')).toBeInTheDocument()
        // Chart should be rendered (check for Recharts elements)
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
      })
    })

    it('should allow timeframe selection', async () => {
      mockPortfolioAPI.getPerformance.mockResolvedValue({
        data: [],
        stats: {},
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('1D')).toBeInTheDocument()
        expect(screen.getByText('1W')).toBeInTheDocument()
        expect(screen.getByText('1M')).toBeInTheDocument()
        expect(screen.getByText('YTD')).toBeInTheDocument()
      })

      // Click on 1W button
      fireEvent.click(screen.getByText('1W'))

      expect(mockPortfolioAPI.getPerformance).toHaveBeenCalledWith('1W')
    })
  })

  describe('Asset Allocation', () => {
    it('should display asset allocation breakdown', async () => {
      mockPortfolioAPI.getAllocation.mockResolvedValue({
        by_asset: [
          { asset: 'BTC', value: 1500000, percentage: 59.1 },
          { asset: 'ETH', value: 540000, percentage: 21.3 },
          { asset: 'Options', value: 500300, percentage: 19.6 },
        ],
        by_type: [
          { type: 'Spot', value: 2040000, percentage: 80.4 },
          { type: 'Options', value: 500300, percentage: 19.6 },
        ],
        by_exchange: [
          { exchange: 'Binance', value: 1200000, percentage: 47.2 },
          { exchange: 'Deribit', value: 840300, percentage: 33.1 },
          { exchange: 'Coinbase', value: 500000, percentage: 19.7 },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
        expect(screen.getByText('BTC')).toBeInTheDocument()
        expect(screen.getByText('59.1%')).toBeInTheDocument()
        expect(screen.getByText('$1,500,000')).toBeInTheDocument()
      })
    })

    it('should display allocation charts', async () => {
      mockPortfolioAPI.getAllocation.mockResolvedValue({
        by_asset: [],
        by_type: [],
        by_exchange: [],
      })

      renderComponent()

      await waitFor(() => {
        // Check for pie chart containers
        expect(screen.getByTestId('allocation-by-asset')).toBeInTheDocument()
        expect(screen.getByTestId('allocation-by-type')).toBeInTheDocument()
        expect(screen.getByTestId('allocation-by-exchange')).toBeInTheDocument()
      })
    })
  })

  describe('Open Positions', () => {
    it('should display list of open positions', async () => {
      mockPortfolioAPI.getPositions.mockResolvedValue({
        positions: [
          {
            id: '1',
            instrument: 'BTC-PERPETUAL',
            type: 'Future',
            side: 'Long',
            quantity: 10,
            entry_price: 45000,
            current_price: 52000,
            value: 520000,
            pnl: 70000,
            pnl_percentage: 15.56,
          },
          {
            id: '2',
            instrument: 'ETH-29DEC23-2200-C',
            type: 'Option',
            side: 'Long',
            quantity: 50,
            entry_price: 120,
            current_price: 180,
            value: 9000,
            pnl: 3000,
            pnl_percentage: 50,
            greeks: {
              delta: 0.65,
              gamma: 0.0012,
              vega: 45.2,
              theta: -12.5,
            },
          },
        ],
        summary: {
          total_positions: 2,
          total_value: 529000,
          total_pnl: 73000,
          winning_positions: 2,
          losing_positions: 0,
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Open Positions')).toBeInTheDocument()
        expect(screen.getByText('BTC-PERPETUAL')).toBeInTheDocument()
        expect(screen.getByText('ETH-29DEC23-2200-C')).toBeInTheDocument()
        expect(screen.getByText('+$70,000')).toBeInTheDocument()
        expect(screen.getByText('+15.56%')).toBeInTheDocument()
      })
    })

    it('should allow position filtering', async () => {
      mockPortfolioAPI.getPositions.mockResolvedValue({
        positions: [],
        summary: {},
      })

      renderComponent()

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search positions...')
        expect(searchInput).toBeInTheDocument()
      })

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search positions...')
      fireEvent.change(searchInput, { target: { value: 'BTC' } })

      // Should filter positions (implementation dependent)
    })

    it('should display position Greeks for options', async () => {
      mockPortfolioAPI.getPositions.mockResolvedValue({
        positions: [
          {
            id: '1',
            instrument: 'ETH-29DEC23-2200-C',
            type: 'Option',
            greeks: {
              delta: 0.65,
              gamma: 0.0012,
              vega: 45.2,
              theta: -12.5,
            },
          },
        ],
        summary: {},
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Δ 0.65')).toBeInTheDocument()
        expect(screen.getByText('Γ 0.0012')).toBeInTheDocument()
      })
    })
  })

  describe('News Feed', () => {
    it('should display market news', async () => {
      mockPortfolioAPI.getNewsFeed.mockResolvedValue({
        news: [
          {
            id: '1',
            title: 'Bitcoin Surges Past $50,000',
            source: 'CoinDesk',
            timestamp: '2023-12-03T10:00:00Z',
            sentiment: 'bullish',
            relevance_score: 0.95,
            affected_assets: ['BTC'],
            summary: 'Bitcoin price surges...',
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Market News & Events')).toBeInTheDocument()
        expect(screen.getByText('Bitcoin Surges Past $50,000')).toBeInTheDocument()
        expect(screen.getByText('CoinDesk')).toBeInTheDocument()
      })
    })
  })

  describe('AI Trade Suggestions', () => {
    it('should display AI-generated trade suggestions', async () => {
      mockPortfolioAPI.getAISuggestions.mockResolvedValue({
        suggestions: [
          {
            id: '1',
            action: 'BUY',
            instrument: 'ETH-29DEC23-2500-C',
            rationale: 'High implied volatility skew detected',
            confidence: 0.85,
            expected_return: 0.25,
            risk_score: 0.6,
            timeframe: '1-3 days',
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('AI Trade Suggestions')).toBeInTheDocument()
        expect(screen.getByText('ETH-29DEC23-2500-C')).toBeInTheDocument()
        expect(screen.getByText('High implied volatility skew detected')).toBeInTheDocument()
        expect(screen.getByText('85%')).toBeInTheDocument() // Confidence
      })
    })

    it('should allow executing AI suggestions', async () => {
      mockPortfolioAPI.getAISuggestions.mockResolvedValue({
        suggestions: [
          {
            id: '1',
            action: 'BUY',
            instrument: 'ETH-29DEC23-2500-C',
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        const executeButton = screen.getByText('Execute')
        expect(executeButton).toBeInTheDocument()
      })

      // Click execute button
      fireEvent.click(screen.getByText('Execute'))

      // Should trigger execution flow (implementation dependent)
    })
  })

  describe('Interactive Features', () => {
    it('should refresh data on demand', async () => {
      mockPortfolioAPI.getOverview.mockResolvedValue({
        total_value: 2540300,
      })

      renderComponent()

      await waitFor(() => {
        const refreshButton = screen.getByLabelText('Refresh data')
        expect(refreshButton).toBeInTheDocument()
      })

      // Click refresh
      fireEvent.click(screen.getByLabelText('Refresh data'))

      // Should refetch data
      expect(mockPortfolioAPI.getOverview).toHaveBeenCalledTimes(2)
    })

    it('should export portfolio data', async () => {
      renderComponent()

      await waitFor(() => {
        const exportButton = screen.getByText('Export')
        expect(exportButton).toBeInTheDocument()
      })

      // Click export
      fireEvent.click(screen.getByText('Export'))

      // Should show export options
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
      expect(screen.getByText('Export as PDF')).toBeInTheDocument()
    })
  })
})