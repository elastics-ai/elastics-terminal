import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DataLibraryModulesPage from '@/app/data-library/modules/page'
import { dataLibraryAPI } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  dataLibraryAPI: {
    getModules: jest.fn(),
    toggleModule: jest.fn(),
    getModuleLogs: jest.fn(),
    updateModuleConfig: jest.fn(),
  },
}))

const mockDataLibraryAPI = dataLibraryAPI as jest.Mocked<typeof dataLibraryAPI>

describe('DataLibraryModulesPage', () => {
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
        <DataLibraryModulesPage />
      </QueryClientProvider>
    )
  }

  const mockModules = {
    modules: [
      {
        id: 'volatility-scanner',
        name: 'Volatility Scanner',
        description: 'Scans markets for volatility opportunities',
        category: 'analytics',
        status: 'active',
        version: '1.2.0',
        author: 'Elastics Team',
        last_updated: '2023-12-01T10:00:00Z',
        metrics: {
          uptime: 99.9,
          data_points_processed: 1234567,
          alerts_generated: 42,
          last_run: '2023-12-03T14:30:00Z',
        },
        config: {
          threshold: 0.05,
          markets: ['BTC', 'ETH'],
          interval: '5m',
        },
      },
      {
        id: 'market-maker',
        name: 'Market Maker Bot',
        description: 'Automated market making strategies',
        category: 'trading',
        status: 'paused',
        version: '2.0.1',
        author: 'Trading Team',
        last_updated: '2023-11-15T08:00:00Z',
        metrics: {
          uptime: 95.5,
          trades_executed: 5678,
          profit: 12345.67,
          last_run: '2023-12-02T18:00:00Z',
        },
        config: {
          spread: 0.002,
          max_position: 10000,
          rebalance_interval: '1h',
        },
      },
    ],
    total: 2,
  }

  describe('Module List', () => {
    it('should display all modules', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
        expect(screen.getByText('Market Maker Bot')).toBeInTheDocument()
      })
    })

    it('should show module status badges', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('Paused')).toBeInTheDocument()
      })
    })

    it('should display module categories', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument()
        expect(screen.getByText('Trading')).toBeInTheDocument()
      })
    })
  })

  describe('Module Filtering', () => {
    it('should filter modules by search term', async () => {
      const user = userEvent.setup()
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search modules...')
      await user.type(searchInput, 'volatility')

      // Should filter to show only volatility scanner
      expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      expect(screen.queryByText('Market Maker Bot')).not.toBeInTheDocument()
    })

    it('should filter modules by category', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument()
      })

      // Click on Analytics category
      fireEvent.click(screen.getByText('Analytics'))

      // Should filter to show only analytics modules
      expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      expect(screen.queryByText('Market Maker Bot')).not.toBeInTheDocument()
    })

    it('should filter modules by status', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('All Status')).toBeInTheDocument()
      })

      // Select Active status filter
      fireEvent.click(screen.getByText('All Status'))
      fireEvent.click(screen.getByText('Active Only'))

      // Should filter to show only active modules
      expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      expect(screen.queryByText('Market Maker Bot')).not.toBeInTheDocument()
    })
  })

  describe('Module Actions', () => {
    it('should toggle module status', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)
      mockDataLibraryAPI.toggleModule.mockResolvedValue({ success: true })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      })

      // Find and click the pause button for active module
      const pauseButton = screen.getAllByLabelText(/pause|stop/i)[0]
      fireEvent.click(pauseButton)

      expect(mockDataLibraryAPI.toggleModule).toHaveBeenCalledWith('volatility-scanner', 'pause')
    })

    it('should open module configuration', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Volatility Scanner')).toBeInTheDocument()
      })

      // Click on a module card
      fireEvent.click(screen.getByText('Volatility Scanner'))

      // Should show configuration panel
      await waitFor(() => {
        expect(screen.getByText('Module Configuration')).toBeInTheDocument()
        expect(screen.getByText('Threshold')).toBeInTheDocument()
      })
    })
  })

  describe('Module Configuration', () => {
    it('should display module config form', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Volatility Scanner'))
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Threshold')).toHaveValue(0.05)
        expect(screen.getByLabelText('Markets')).toHaveValue('BTC,ETH')
        expect(screen.getByLabelText('Interval')).toHaveValue('5m')
      })
    })

    it('should update module configuration', async () => {
      const user = userEvent.setup()
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)
      mockDataLibraryAPI.updateModuleConfig.mockResolvedValue({ success: true })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Volatility Scanner'))
      })

      // Update threshold value
      const thresholdInput = screen.getByLabelText('Threshold')
      await user.clear(thresholdInput)
      await user.type(thresholdInput, '0.1')

      // Save configuration
      fireEvent.click(screen.getByText('Save Configuration'))

      expect(mockDataLibraryAPI.updateModuleConfig).toHaveBeenCalledWith(
        'volatility-scanner',
        expect.objectContaining({ threshold: 0.1 })
      )
    })
  })

  describe('Module Logs', () => {
    it('should display module logs', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)
      mockDataLibraryAPI.getModuleLogs.mockResolvedValue({
        logs: [
          {
            timestamp: '2023-12-03T14:30:00Z',
            level: 'info',
            message: 'Scanning BTC market for volatility',
          },
          {
            timestamp: '2023-12-03T14:30:05Z',
            level: 'warning',
            message: 'High volatility detected: 5.2%',
          },
        ],
      })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Volatility Scanner'))
      })

      // Switch to logs tab
      fireEvent.click(screen.getByText('Logs'))

      await waitFor(() => {
        expect(screen.getByText('Scanning BTC market for volatility')).toBeInTheDocument()
        expect(screen.getByText('High volatility detected: 5.2%')).toBeInTheDocument()
      })
    })

    it('should auto-refresh logs', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)
      mockDataLibraryAPI.getModuleLogs.mockResolvedValue({ logs: [] })

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Volatility Scanner'))
      })

      fireEvent.click(screen.getByText('Logs'))

      // Should fetch logs periodically
      await waitFor(() => {
        expect(mockDataLibraryAPI.getModuleLogs).toHaveBeenCalled()
      })
    })
  })

  describe('Module Metrics', () => {
    it('should display module metrics', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('99.9% uptime')).toBeInTheDocument()
        expect(screen.getByText('1.2M data points')).toBeInTheDocument()
        expect(screen.getByText('42 alerts')).toBeInTheDocument()
      })
    })

    it('should show last run time', async () => {
      mockDataLibraryAPI.getModules.mockResolvedValue(mockModules)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Last run:/)).toBeInTheDocument()
      })
    })
  })

  describe('Add Module', () => {
    it('should show add module button', () => {
      renderComponent()

      expect(screen.getByText('Add Module')).toBeInTheDocument()
    })

    it('should open module marketplace on click', () => {
      renderComponent()

      fireEvent.click(screen.getByText('Add Module'))

      // Should navigate or open modal (implementation dependent)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockDataLibraryAPI.getModules.mockRejectedValue(new Error('API Error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Error loading modules/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockDataLibraryAPI.getModules.mockRejectedValue(new Error('API Error'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading skeleton', () => {
      mockDataLibraryAPI.getModules.mockImplementation(() => new Promise(() => {}))

      renderComponent()

      expect(screen.getAllByTestId('module-skeleton')).toHaveLength(6)
    })
  })
})