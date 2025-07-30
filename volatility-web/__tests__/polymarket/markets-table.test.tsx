/**
 * Tests for Polymarket MarketsTable component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '../../jest.setup'
import { MarketsTable } from '@/components/bloomberg/views/polymarket/markets-table'
import { polymarketAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  polymarketAPI: {
    getMarkets: jest.fn()
  }
}))

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
  formatNumber: jest.fn((num, decimals) => num.toFixed(decimals)),
  formatCurrency: jest.fn((num) => `$${num.toLocaleString()}`)
}))

const mockPolymarketAPI = polymarketAPI as jest.Mocked<typeof polymarketAPI>

const mockMarketsResponse = {
  markets: [
    {
      id: 'test-1',
      question: 'Will Bitcoin reach $100,000 by end of 2024?',
      yes_percentage: 35.2,
      no_percentage: 64.8,
      volume: 1250000,
      end_date: '2024-12-31',
      category: 'Crypto',
      tags: ['bitcoin', 'crypto', 'price'],
      active: true
    },
    {
      id: 'test-2', 
      question: 'Will ETH/BTC ratio exceed 0.1 in Q1 2024?',
      yes_percentage: 42.7,
      no_percentage: 57.3,
      volume: 850000,
      end_date: '2024-03-31',
      category: 'Crypto',
      tags: ['ethereum', 'bitcoin', 'ratio'],
      active: false
    }
  ],
  total: 2,
  last_update: '2024-01-01T12:00:00.000Z',
  is_mock: false
}

function renderWithQueryClient(component: React.ReactElement, customOptions = {}) {
  const queryClient = createTestQueryClient()
  
  // Apply any custom options on top of the base config
  if (Object.keys(customOptions).length > 0) {
    queryClient.setDefaultOptions({
      queries: {
        ...queryClient.getDefaultOptions().queries,
        ...customOptions
      }
    })
  }
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('MarketsTable', () => {
  const mockOnSelectMarket = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockPolymarketAPI.getMarkets.mockImplementation(() => new Promise(() => {}))
    
    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders markets data when API call succeeds', async () => {
    mockPolymarketAPI.getMarkets.mockResolvedValue(mockMarketsResponse)

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      expect(screen.getByText('Will Bitcoin reach $100,000 by end of 2024?')).toBeInTheDocument()
      expect(screen.getByText('Will ETH/BTC ratio exceed 0.1 in Q1 2024?')).toBeInTheDocument()
    })

    // Check that percentages are displayed correctly
    expect(screen.getByText('35.2%')).toBeInTheDocument()
    expect(screen.getByText('64.8%')).toBeInTheDocument()
    expect(screen.getByText('42.7%')).toBeInTheDocument()
    expect(screen.getByText('57.3%')).toBeInTheDocument()

    // Check volume formatting
    expect(screen.getByText('$1,250,000')).toBeInTheDocument()
    expect(screen.getByText('$850,000')).toBeInTheDocument()

    // Check status
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('CLOSED')).toBeInTheDocument()
  })

  it('renders error state when API call fails', async () => {
    const errorMessage = 'Network error'
    mockPolymarketAPI.getMarkets.mockRejectedValue(new Error(errorMessage))

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    // Wait for error to appear - should be quick with no retries
    await waitFor(() => {
      expect(screen.getByText(/Error loading markets/)).toBeInTheDocument()
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    }, { timeout: 1000 })
    
    // Should only be called once since no retries
    expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledTimes(1)
  })

  it('calls onSelectMarket when a market row is clicked', async () => {
    mockPolymarketAPI.getMarkets.mockResolvedValue(mockMarketsResponse)

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      expect(screen.getByText('Will Bitcoin reach $100,000 by end of 2024?')).toBeInTheDocument()
    })

    const marketRow = screen.getByText('Will Bitcoin reach $100,000 by end of 2024?').closest('tr')
    expect(marketRow).toBeInTheDocument()

    fireEvent.click(marketRow!)

    expect(mockOnSelectMarket).toHaveBeenCalledWith(mockMarketsResponse.markets[0])
  })

  it('passes search term to API call', async () => {
    const searchTerm = 'bitcoin'
    mockPolymarketAPI.getMarkets.mockResolvedValue(mockMarketsResponse)

    renderWithQueryClient(
      <MarketsTable searchTerm={searchTerm} onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledWith(searchTerm)
    })
  })

  it('displays empty state when no markets are returned', async () => {
    mockPolymarketAPI.getMarkets.mockResolvedValue({
      ...mockMarketsResponse,
      markets: []
    })

    renderWithQueryClient(
      <MarketsTable searchTerm="nonexistent" onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      expect(screen.getByText('No markets found matching your search')).toBeInTheDocument()
    })
  })

  it('displays demo data indicator when is_mock is true', async () => {
    mockPolymarketAPI.getMarkets.mockResolvedValue({
      ...mockMarketsResponse,
      is_mock: true
    })

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      expect(screen.getByText(/Demo Data/)).toBeInTheDocument()
    })
  })

  it('retries API calls on failure', async () => {
    mockPolymarketAPI.getMarkets
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockMarketsResponse)

    // Temporarily override NODE_ENV for this component to enable retries
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />,
      { retry: 2, retryDelay: 0 } // Enable retries for this specific test
    )

    await waitFor(() => {
      expect(screen.getByText('Will Bitcoin reach $100,000 by end of 2024?')).toBeInTheDocument()
    }, { timeout: 5000 })

    // Should have been called 3 times (initial + 2 retries before success)
    expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledTimes(3)
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })

  it('applies correct styling classes for unified theme', async () => {
    // Fixed React Query timeout issues
    mockPolymarketAPI.getMarkets.mockResolvedValue(mockMarketsResponse)

    renderWithQueryClient(
      <MarketsTable searchTerm="" onSelectMarket={mockOnSelectMarket} />
    )

    await waitFor(() => {
      const tableContainer = screen.getByText('ACTIVE MARKETS').closest('div').parentElement
      expect(tableContainer).toHaveClass('border', 'border-border', 'rounded-lg')
    }, { timeout: 3000 })
  })
})