import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MarketOverviewPage from '@/app/market-overview/page'
import { marketAPI, dataLibraryAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  marketAPI: {
    getSnapshot: jest.fn(),
    getIndices: jest.fn(),
    getMovers: jest.fn(),
    getOptionsActivity: jest.fn(),
  },
  dataLibraryAPI: {
    getMarketStats: jest.fn(),
  },
}))

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

const mockMarketAPI = marketAPI as jest.Mocked<typeof marketAPI>
const mockDataLibraryAPI = dataLibraryAPI as jest.Mocked<typeof dataLibraryAPI>

describe('MarketOverviewPage', () => {
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
        <MarketOverviewPage />
      </QueryClientProvider>
    )
  }

  const mockMarketSnapshot = {
    indices: [
      {
        symbol: 'SPX',
        name: 'S&P 500',
        price: 4783.25,
        change: 23.45,
        changePercent: 0.49,
        volume: '2.3B',
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 52345.67,
        change: 1234.56,
        changePercent: 2.41,
        volume: '24.5B',
      },
    ],
    timestamp: '2023-12-03T15:00:00Z',
  }

  describe('Market Indices', () => {
    it('should display market indices', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('S&P 500')).toBeInTheDocument()
        expect(screen.getByText('Bitcoin')).toBeInTheDocument()
        expect(screen.getByText('$4,783.25')).toBeInTheDocument()
        expect(screen.getByText('$52,345.67')).toBeInTheDocument()
      })
    })

    it('should show price changes with colors', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        const spxChange = screen.getByText('+0.49%')
        const btcChange = screen.getByText('+2.41%')
        
        // Check if positive changes have green styling
        expect(spxChange.closest('[class*="green"]')).toBeTruthy()
        expect(btcChange.closest('[class*="green"]')).toBeTruthy()
      })
    })

    it('should display volume information', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Vol: 2.3B')).toBeInTheDocument()
        expect(screen.getByText('Vol: 24.5B')).toBeInTheDocument()
      })
    })
  })

  describe('Market Performance Chart', () => {
    it('should render performance chart', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Market Performance')).toBeInTheDocument()
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })
    })

    it('should allow timeframe selection', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('1 Day')).toBeInTheDocument()
      })

      // Open timeframe dropdown
      fireEvent.click(screen.getByText('1 Day'))
      
      // Check available options
      expect(screen.getByText('1 Week')).toBeInTheDocument()
      expect(screen.getByText('1 Month')).toBeInTheDocument()
      expect(screen.getByText('YTD')).toBeInTheDocument()
    })
  })

  describe('Top Movers', () => {
    it('should display top movers table', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        movers: {
          gainers: [
            {
              symbol: 'TSLA',
              name: 'Tesla Inc',
              price: 234.56,
              change: 12.34,
              changePercent: 5.56,
              volume: '123M',
            },
          ],
          losers: [
            {
              symbol: 'AAPL',
              name: 'Apple Inc',
              price: 189.23,
              change: -4.56,
              changePercent: -2.35,
              volume: '78M',
            },
          ],
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Top Movers')).toBeInTheDocument()
        expect(screen.getByText('TSLA')).toBeInTheDocument()
        expect(screen.getByText('Tesla Inc')).toBeInTheDocument()
        expect(screen.getByText('+5.56%')).toBeInTheDocument()
      })
    })

    it('should highlight gainers and losers differently', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        movers: {
          gainers: [{ symbol: 'TSLA', changePercent: 5.56 }],
          losers: [{ symbol: 'AAPL', changePercent: -2.35 }],
        },
      })

      renderComponent()

      await waitFor(() => {
        const gainer = screen.getByText('+5.56%')
        const loser = screen.getByText('-2.35%')
        
        expect(gainer.className).toContain('green')
        expect(loser.className).toContain('red')
      })
    })
  })

  describe('Options Activity', () => {
    it('should display options activity', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        optionsActivity: [
          {
            contract: 'BTC-29MAR24-60000-C',
            underlying: 'BTC',
            strike: 60000,
            expiry: '29 Mar',
            volume: 2345,
            oi: 12345,
            iv: 68.5,
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Options Activity')).toBeInTheDocument()
        expect(screen.getByText('BTC-29MAR24-60000-C')).toBeInTheDocument()
        expect(screen.getByText('IV: 68.5%')).toBeInTheDocument()
      })
    })

    it('should display volume and open interest', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        optionsActivity: [
          {
            contract: 'BTC-29MAR24-60000-C',
            volume: 2345,
            oi: 12345,
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Volume:')).toBeInTheDocument()
        expect(screen.getByText('2,345')).toBeInTheDocument()
        expect(screen.getByText('OI:')).toBeInTheDocument()
        expect(screen.getByText('12,345')).toBeInTheDocument()
      })
    })
  })

  describe('Market Statistics', () => {
    it('should display market breadth', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        stats: {
          advancing: 1234,
          declining: 567,
          unchanged: 89,
          advanceDeclineRatio: 2.18,
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Market Statistics')).toBeInTheDocument()
        expect(screen.getByText('Advancing')).toBeInTheDocument()
        expect(screen.getByText('1,234')).toBeInTheDocument()
        expect(screen.getByText('65%')).toBeInTheDocument()
      })
    })

    it('should display put/call ratio', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue({
        stats: {
          putCallRatio: 0.85,
          vix: 14.25,
          marketCap: '42.3T',
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Put/Call Ratio')).toBeInTheDocument()
        expect(screen.getByText('0.85')).toBeInTheDocument()
        expect(screen.getByText('VIX')).toBeInTheDocument()
        expect(screen.getByText('14.25')).toBeInTheDocument()
      })
    })
  })

  describe('Auto Refresh', () => {
    it('should show last updated time', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Last updated:.*ago/)).toBeInTheDocument()
      })
    })

    it('should have refresh button', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh')
        expect(refreshButton).toBeInTheDocument()
      })

      // Click refresh
      fireEvent.click(screen.getByText('Refresh'))

      // Should refetch data
      expect(mockMarketAPI.getSnapshot).toHaveBeenCalledTimes(2)
    })

    it('should auto-refresh data', async () => {
      jest.useFakeTimers()
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        expect(mockMarketAPI.getSnapshot).toHaveBeenCalledTimes(1)
      })

      // Fast forward 10 seconds (auto-refresh interval)
      jest.advanceTimersByTime(10000)

      await waitFor(() => {
        expect(mockMarketAPI.getSnapshot).toHaveBeenCalledTimes(2)
      })

      jest.useRealTimers()
    })
  })

  describe('Market Filters', () => {
    it('should allow filtering by market type', async () => {
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      renderComponent()

      await waitFor(() => {
        const marketFilter = screen.getByLabelText('Market')
        expect(marketFilter).toBeInTheDocument()
      })

      // Change market filter
      fireEvent.change(screen.getByLabelText('Market'), { target: { value: 'crypto' } })

      // Should refetch with filter
      expect(mockMarketAPI.getSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ market: 'crypto' })
      )
    })
  })

  describe('Loading States', () => {
    it('should show loading skeleton', () => {
      mockMarketAPI.getSnapshot.mockImplementation(() => new Promise(() => {}))

      renderComponent()

      expect(screen.getAllByTestId('skeleton')).toHaveLength(5) // 5 index cards
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockMarketAPI.getSnapshot.mockRejectedValue(new Error('Network error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Error loading market data/)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockMarketAPI.getSnapshot.mockRejectedValue(new Error('Network error'))

      renderComponent()

      await waitFor(() => {
        const retryButton = screen.getByText('Retry')
        expect(retryButton).toBeInTheDocument()
      })

      // Reset mock to succeed
      mockMarketAPI.getSnapshot.mockResolvedValue(mockMarketSnapshot)

      // Click retry
      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.getByText('S&P 500')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile', () => {
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      renderComponent()

      // Mobile layout adjustments
      expect(screen.getByText('Market Overview')).toBeInTheDocument()
    })
  })
})