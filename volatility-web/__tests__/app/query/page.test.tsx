import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import QueryPage from '@/app/query/page'
import { queryAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  queryAPI: {
    executeQuery: jest.fn(),
    getSavedQueries: jest.fn(),
    saveQuery: jest.fn(),
    deleteQuery: jest.fn(),
    getQueryHistory: jest.fn(),
  },
}))

// Mock react-plotly.js
jest.mock('react-plotly.js', () => ({
  __esModule: true,
  default: ({ data, layout }: any) => (
    <div data-testid="plotly-chart" data-type={layout?.title}>
      {JSON.stringify(data)}
    </div>
  ),
}))

const mockQueryAPI = queryAPI as jest.Mocked<typeof queryAPI>

describe('QueryPage', () => {
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
        <QueryPage />
      </QueryClientProvider>
    )
  }

  const mockQueryResponse = {
    query: "What's the current implied volatility for BTC options?",
    response: {
      text: "The current implied volatility for BTC options shows an ATM IV of 68.5% with a volatility smile...",
      data: {
        type: 'volatility_surface',
        values: {
          strikes: [45000, 50000, 55000, 60000],
          ivs: [72.1, 68.5, 69.8, 74.2],
          spot: 52000,
        },
      },
      charts: [
        {
          type: 'scatter',
          title: 'BTC Implied Volatility Smile',
          data: {
            x: [45000, 50000, 55000, 60000],
            y: [72.1, 68.5, 69.8, 74.2],
          },
        },
      ],
      suggestions: [
        "Check the term structure of volatility",
        "Compare with historical volatility",
        "Analyze skew patterns",
      ],
    },
    timestamp: '2023-12-03T15:00:00Z',
  }

  describe('Query Input', () => {
    it('should display query input field', () => {
      renderComponent()

      expect(screen.getByPlaceholderText(/Ask anything about markets/i)).toBeInTheDocument()
    })

    it('should submit query on enter', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'What is BTC volatility?{enter}')

      expect(mockQueryAPI.executeQuery).toHaveBeenCalledWith({
        query: 'What is BTC volatility?',
        context: {},
      })
    })

    it('should submit query on button click', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'What is BTC volatility?')
      
      fireEvent.click(screen.getByLabelText(/submit query/i))

      expect(mockQueryAPI.executeQuery).toHaveBeenCalled()
    })

    it('should show loading state during query', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockQueryResponse), 1000))
      )

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      expect(screen.getByText(/Analyzing/i)).toBeInTheDocument()
    })
  })

  describe('Query Response', () => {
    it('should display text response', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(screen.getByText(/current implied volatility for BTC options/)).toBeInTheDocument()
      })
    })

    it('should render data visualizations', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(screen.getByTestId('plotly-chart')).toBeInTheDocument()
      })
    })

    it('should display follow-up suggestions', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(screen.getByText('Check the term structure of volatility')).toBeInTheDocument()
        expect(screen.getByText('Compare with historical volatility')).toBeInTheDocument()
      })
    })

    it('should handle follow-up query clicks', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        fireEvent.click(screen.getByText('Check the term structure of volatility'))
      })

      expect(mockQueryAPI.executeQuery).toHaveBeenCalledWith({
        query: 'Check the term structure of volatility',
        context: expect.any(Object),
      })
    })
  })

  describe('Query History', () => {
    it('should display query history', async () => {
      mockQueryAPI.getQueryHistory.mockResolvedValue({
        queries: [
          {
            id: '1',
            query: 'What is the VIX level?',
            timestamp: '2023-12-03T14:00:00Z',
          },
          {
            id: '2',
            query: 'Show me BTC options chain',
            timestamp: '2023-12-03T13:00:00Z',
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Recent Queries')).toBeInTheDocument()
        expect(screen.getByText('What is the VIX level?')).toBeInTheDocument()
        expect(screen.getByText('Show me BTC options chain')).toBeInTheDocument()
      })
    })

    it('should allow clicking on history items', async () => {
      mockQueryAPI.getQueryHistory.mockResolvedValue({
        queries: [
          {
            id: '1',
            query: 'What is the VIX level?',
            timestamp: '2023-12-03T14:00:00Z',
          },
        ],
      })
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('What is the VIX level?'))
      })

      expect(mockQueryAPI.executeQuery).toHaveBeenCalledWith({
        query: 'What is the VIX level?',
        context: {},
      })
    })

    it('should clear query history', async () => {
      mockQueryAPI.getQueryHistory.mockResolvedValue({
        queries: [{ id: '1', query: 'Test' }],
      })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Clear History'))
      })

      // Should show confirmation dialog
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument()

      // Confirm clear
      fireEvent.click(screen.getByText('Confirm'))

      // History should be cleared
      expect(screen.queryByText('Test')).not.toBeInTheDocument()
    })
  })

  describe('Saved Queries', () => {
    it('should display saved queries', async () => {
      mockQueryAPI.getSavedQueries.mockResolvedValue({
        queries: [
          {
            id: '1',
            name: 'Daily Vol Check',
            query: 'What is current market volatility?',
            tags: ['volatility', 'daily'],
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Saved Queries')).toBeInTheDocument()
        expect(screen.getByText('Daily Vol Check')).toBeInTheDocument()
      })
    })

    it('should save current query', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)
      mockQueryAPI.saveQuery.mockResolvedValue({ success: true })

      renderComponent()

      // Execute a query first
      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/save query/i))
      })

      // Should show save dialog
      expect(screen.getByText('Save Query')).toBeInTheDocument()

      // Enter name and save
      const nameInput = screen.getByPlaceholderText('Query name')
      await user.type(nameInput, 'My Test Query')
      
      fireEvent.click(screen.getByText('Save'))

      expect(mockQueryAPI.saveQuery).toHaveBeenCalledWith({
        name: 'My Test Query',
        query: 'Test query',
        tags: [],
      })
    })

    it('should delete saved query', async () => {
      mockQueryAPI.getSavedQueries.mockResolvedValue({
        queries: [
          {
            id: '1',
            name: 'Test Query',
            query: 'Test',
          },
        ],
      })
      mockQueryAPI.deleteQuery.mockResolvedValue({ success: true })

      renderComponent()

      await waitFor(() => {
        const deleteButton = screen.getByLabelText(/delete.*test query/i)
        fireEvent.click(deleteButton)
      })

      expect(mockQueryAPI.deleteQuery).toHaveBeenCalledWith('1')
    })
  })

  describe('Statistical Analysis', () => {
    it('should display statistical results', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue({
        ...mockQueryResponse,
        response: {
          ...mockQueryResponse.response,
          statistics: {
            mean: 68.5,
            std: 3.2,
            min: 65.1,
            max: 74.2,
            correlation: 0.85,
          },
        },
      })

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(screen.getByText('Statistical Analysis')).toBeInTheDocument()
        expect(screen.getByText('Mean: 68.5')).toBeInTheDocument()
        expect(screen.getByText('Std Dev: 3.2')).toBeInTheDocument()
      })
    })
  })

  describe('Export Functionality', () => {
    it('should export query results', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockResolvedValue(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/export/i))
      })

      // Should show export options
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
      expect(screen.getByText('Export as JSON')).toBeInTheDocument()
      expect(screen.getByText('Export as PDF')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle query errors', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockRejectedValue(new Error('Query failed'))

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(screen.getByText(/Query failed/)).toBeInTheDocument()
      })
    })

    it('should show retry option on error', async () => {
      const user = userEvent.setup()
      mockQueryAPI.executeQuery.mockRejectedValueOnce(new Error('Query failed'))
      mockQueryAPI.executeQuery.mockResolvedValueOnce(mockQueryResponse)

      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        fireEvent.click(screen.getByText('Retry'))
      })

      await waitFor(() => {
        expect(screen.getByText(/current implied volatility/)).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should focus input on /', async () => {
      renderComponent()

      fireEvent.keyDown(document, { key: '/', code: 'Slash' })

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      expect(document.activeElement).toBe(input)
    })

    it('should clear input on Escape', async () => {
      const user = userEvent.setup()
      renderComponent()

      const input = screen.getByPlaceholderText(/Ask anything about markets/i)
      await user.type(input, 'Test query')
      
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

      expect(input).toHaveValue('')
    })
  })
})