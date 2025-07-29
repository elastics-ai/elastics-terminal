import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DataCatalogPage from '@/app/data-library/catalog/page'
import { dataLibraryAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  dataLibraryAPI: {
    getDatasets: jest.fn(),
    getDatasetDetails: jest.fn(),
    subscribeToDataset: jest.fn(),
    downloadDataset: jest.fn(),
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

const mockDataLibraryAPI = dataLibraryAPI as jest.Mocked<typeof dataLibraryAPI>

describe('DataCatalogPage', () => {
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
        <DataCatalogPage />
      </QueryClientProvider>
    )
  }

  const mockDatasets = {
    datasets: [
      {
        id: 'btc-options-chain',
        name: 'BTC Options Chain',
        description: 'Real-time Bitcoin options chain data from Deribit',
        category: 'options',
        provider: 'Deribit',
        frequency: 'real-time',
        last_updated: '2023-12-03T15:00:00Z',
        size: '125 MB',
        format: 'JSON',
        fields: ['strike', 'expiry', 'bid', 'ask', 'volume', 'open_interest', 'iv'],
        tags: ['bitcoin', 'options', 'derivatives'],
        subscription: {
          status: 'active',
          tier: 'premium',
          cost: 99,
        },
        quality_score: 0.95,
        usage_count: 1234,
      },
      {
        id: 'market-sentiment',
        name: 'Market Sentiment Analysis',
        description: 'Aggregated sentiment data from social media and news',
        category: 'sentiment',
        provider: 'Elastics AI',
        frequency: '15min',
        last_updated: '2023-12-03T14:45:00Z',
        size: '50 MB',
        format: 'CSV',
        fields: ['timestamp', 'asset', 'sentiment_score', 'volume', 'sources'],
        tags: ['sentiment', 'social', 'ai'],
        subscription: {
          status: 'available',
          tier: 'basic',
          cost: 29,
        },
        quality_score: 0.88,
        usage_count: 567,
      },
    ],
    total: 2,
    categories: ['options', 'sentiment', 'market-data', 'on-chain'],
  }

  describe('Dataset Grid', () => {
    it('should display all datasets', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('BTC Options Chain')).toBeInTheDocument()
        expect(screen.getByText('Market Sentiment Analysis')).toBeInTheDocument()
      })
    })

    it('should show dataset metadata', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Deribit')).toBeInTheDocument()
        expect(screen.getByText('real-time')).toBeInTheDocument()
        expect(screen.getByText('125 MB')).toBeInTheDocument()
      })
    })

    it('should display quality scores', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument() // Quality score
        expect(screen.getByText('88%')).toBeInTheDocument()
      })
    })

    it('should show subscription status', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Subscribed')).toBeInTheDocument()
        expect(screen.getByText('$29/mo')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filters', () => {
    it('should filter datasets by search term', async () => {
      const user = userEvent.setup()
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search datasets...')
      await user.type(searchInput, 'bitcoin')

      await waitFor(() => {
        expect(screen.getByText('BTC Options Chain')).toBeInTheDocument()
        expect(screen.queryByText('Market Sentiment Analysis')).not.toBeInTheDocument()
      })
    })

    it('should filter by category', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Options'))
      })

      expect(screen.getByText('BTC Options Chain')).toBeInTheDocument()
      expect(screen.queryByText('Market Sentiment Analysis')).not.toBeInTheDocument()
    })

    it('should filter by provider', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        const providerFilter = screen.getByLabelText('Provider')
        fireEvent.change(providerFilter, { target: { value: 'Deribit' } })
      })

      expect(screen.getByText('BTC Options Chain')).toBeInTheDocument()
      expect(screen.queryByText('Market Sentiment Analysis')).not.toBeInTheDocument()
    })

    it('should filter by update frequency', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Real-time'))
      })

      expect(screen.getByText('BTC Options Chain')).toBeInTheDocument()
      expect(screen.queryByText('Market Sentiment Analysis')).not.toBeInTheDocument()
    })

    it('should sort datasets', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        const sortSelect = screen.getByLabelText('Sort by')
        fireEvent.change(sortSelect, { target: { value: 'quality' } })
      })

      // Should reorder based on quality score
      const datasetNames = screen.getAllByTestId('dataset-name')
      expect(datasetNames[0]).toHaveTextContent('BTC Options Chain')
    })
  })

  describe('Dataset Details', () => {
    it('should show dataset details on click', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.getDatasetDetails.mockResolvedValue({
        ...mockDatasets.datasets[0],
        sample_data: [
          { strike: 50000, bid: 0.05, ask: 0.06, iv: 0.65 },
          { strike: 52000, bid: 0.04, ask: 0.045, iv: 0.68 },
        ],
        schema: {
          strike: 'number',
          expiry: 'datetime',
          bid: 'number',
          ask: 'number',
          volume: 'number',
          open_interest: 'number',
          iv: 'number',
        },
      })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('BTC Options Chain'))
      })

      await waitFor(() => {
        expect(screen.getByText('Dataset Details')).toBeInTheDocument()
        expect(screen.getByText('Schema')).toBeInTheDocument()
        expect(screen.getByText('Sample Data')).toBeInTheDocument()
      })
    })

    it('should display field descriptions', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('BTC Options Chain'))
      })

      await waitFor(() => {
        expect(screen.getByText(/strike, expiry, bid/)).toBeInTheDocument()
      })
    })

    it('should show data preview', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.getDatasetDetails.mockResolvedValue({
        sample_data: [
          { strike: 50000, bid: 0.05, ask: 0.06, iv: 0.65 },
        ],
      })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('BTC Options Chain'))
      })

      await waitFor(() => {
        expect(screen.getByText('50000')).toBeInTheDocument()
        expect(screen.getByText('0.05')).toBeInTheDocument()
      })
    })
  })

  describe('Subscription Management', () => {
    it('should allow subscribing to dataset', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.subscribeToDataset.mockResolvedValue({ success: true })

      renderComponent()

      await waitFor(() => {
        const subscribeButton = screen.getAllByText('Subscribe')[0]
        fireEvent.click(subscribeButton)
      })

      expect(mockDataLibraryAPI.subscribeToDataset).toHaveBeenCalledWith('market-sentiment')
    })

    it('should show subscription confirmation', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.subscribeToDataset.mockResolvedValue({ success: true })

      renderComponent()

      await waitFor(() => {
        const subscribeButton = screen.getAllByText('Subscribe')[0]
        fireEvent.click(subscribeButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Successfully subscribed/)).toBeInTheDocument()
      })
    })

    it('should handle subscription errors', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.subscribeToDataset.mockRejectedValue(new Error('Payment failed'))

      renderComponent()

      await waitFor(() => {
        const subscribeButton = screen.getAllByText('Subscribe')[0]
        fireEvent.click(subscribeButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Payment failed/)).toBeInTheDocument()
      })
    })
  })

  describe('Data Download', () => {
    it('should allow downloading subscribed datasets', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.downloadDataset.mockResolvedValue({ url: 'https://download.url' })

      renderComponent()

      await waitFor(() => {
        const downloadButton = screen.getByLabelText(/download.*btc options/i)
        fireEvent.click(downloadButton)
      })

      expect(mockDataLibraryAPI.downloadDataset).toHaveBeenCalledWith('btc-options-chain')
    })

    it('should show download progress', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)
      mockDataLibraryAPI.downloadDataset.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )

      renderComponent()

      await waitFor(() => {
        const downloadButton = screen.getByLabelText(/download.*btc options/i)
        fireEvent.click(downloadButton)
      })

      expect(screen.getByText(/Downloading/)).toBeInTheDocument()
    })
  })

  describe('Usage Statistics', () => {
    it('should display usage count', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('1,234 users')).toBeInTheDocument()
        expect(screen.getByText('567 users')).toBeInTheDocument()
      })
    })

    it('should show last updated time', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue(mockDatasets)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no datasets', async () => {
      mockDataLibraryAPI.getDatasets.mockResolvedValue({ datasets: [], total: 0 })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/No datasets found/)).toBeInTheDocument()
      })
    })

    it('should show no results for search', async () => {
      const user = userEvent.setup()
      mockDataLibraryAPI.getDatasets.mockResolvedValue({ datasets: [], total: 0 })

      renderComponent()

      const searchInput = screen.getByPlaceholderText('Search datasets...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/No datasets match your search/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading skeletons', () => {
      mockDataLibraryAPI.getDatasets.mockImplementation(() => new Promise(() => {}))

      renderComponent()

      expect(screen.getAllByTestId('dataset-skeleton')).toHaveLength(8)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockDataLibraryAPI.getDatasets.mockRejectedValue(new Error('Network error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Error loading datasets/)).toBeInTheDocument()
      })
    })
  })
})