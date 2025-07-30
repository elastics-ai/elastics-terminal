import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EnhancedPortfolioPage from '@/app/portfolio/enhanced/page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/portfolio/enhanced',
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: jest.fn(),
}))

// Mock AppLayout to avoid FloatingChatProvider issues
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}))

// Mock FixedChatInput to avoid FloatingChatProvider dependency
jest.mock('@/components/chat/FixedChatInput', () => ({
  FixedChatInput: () => <div data-testid="fixed-chat">Chat Input</div>,
}))

// Mock recharts to avoid render issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
}))

describe('EnhancedPortfolioPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EnhancedPortfolioPage />
      </QueryClientProvider>
    )
  }

  describe('Portfolio Analytics Dashboard', () => {
    it('should render all main sections', () => {
      renderComponent()

      expect(screen.getByText('Portfolio Analytics')).toBeInTheDocument()
      expect(screen.getByText('Performance')).toBeInTheDocument()
      expect(screen.getByText('Risk Metrics')).toBeInTheDocument()
      expect(screen.getByText('Asset Allocation')).toBeInTheDocument()
    })

    it('should display key metrics cards', () => {
      renderComponent()

      expect(screen.getByText('Total Value')).toBeInTheDocument()
      expect(screen.getByText('Today\'s P&L')).toBeInTheDocument()
      expect(screen.getByText('Month P&L')).toBeInTheDocument()
      expect(screen.getByText('YTD Return')).toBeInTheDocument()
    })
  })

  describe('Performance Section', () => {
    it('should render portfolio value chart', () => {
      renderComponent()

      expect(screen.getByText('Portfolio Value Over Time')).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should render daily P&L chart', () => {
      renderComponent()

      expect(screen.getByText('Daily P&L')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should render cumulative returns chart', () => {
      renderComponent()

      expect(screen.getByText('Cumulative Returns')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('should allow timeframe selection', () => {
      renderComponent()

      const timeframeButtons = screen.getAllByRole('button', { name: /1D|1W|1M|3M|YTD|ALL/i })
      expect(timeframeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Risk Metrics Section', () => {
    it('should display volatility analysis', () => {
      renderComponent()

      expect(screen.getByText('Volatility Analysis')).toBeInTheDocument()
      expect(screen.getByText('30-Day Vol')).toBeInTheDocument()
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
    })

    it('should display Greeks radar chart', () => {
      renderComponent()

      expect(screen.getByText('Greeks Exposure')).toBeInTheDocument()
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    })

    it('should display correlation heatmap placeholder', () => {
      renderComponent()

      expect(screen.getByText('Asset Correlation')).toBeInTheDocument()
      // Heatmap is custom component, check for container
      expect(screen.getByText(/Correlation heatmap/i)).toBeInTheDocument()
    })

    it('should display VaR metrics', () => {
      renderComponent()

      expect(screen.getByText('Value at Risk (95%)')).toBeInTheDocument()
      expect(screen.getByText(/\$45,230/)).toBeInTheDocument()
    })
  })

  describe('Asset Allocation Section', () => {
    it('should display allocation by asset pie chart', () => {
      renderComponent()

      expect(screen.getByText('By Asset')).toBeInTheDocument()
      const pieCharts = screen.getAllByTestId('pie-chart')
      expect(pieCharts.length).toBeGreaterThan(0)
    })

    it('should display allocation by type', () => {
      renderComponent()

      expect(screen.getByText('By Type')).toBeInTheDocument()
      expect(screen.getByText(/Spot|Options|Futures/)).toBeInTheDocument()
    })

    it('should display allocation by exchange', () => {
      renderComponent()

      expect(screen.getByText('By Exchange')).toBeInTheDocument()
      expect(screen.getByText(/Binance|Deribit/)).toBeInTheDocument()
    })

    it('should show allocation percentages', () => {
      renderComponent()

      // Check for percentage values
      const percentages = screen.getAllByText(/\d+(\.\d+)?%/)
      expect(percentages.length).toBeGreaterThan(0)
    })
  })

  describe('Top Performers Section', () => {
    it('should display top performing positions', () => {
      renderComponent()

      expect(screen.getByText('Top Performers')).toBeInTheDocument()
      expect(screen.getByText('BTC-PERPETUAL')).toBeInTheDocument()
      expect(screen.getByText('ETH-29DEC23-2200-C')).toBeInTheDocument()
    })

    it('should show P&L for each position', () => {
      renderComponent()

      expect(screen.getByText('+$45,230')).toBeInTheDocument()
      expect(screen.getByText('+$23,450')).toBeInTheDocument()
    })

    it('should show percentage returns', () => {
      renderComponent()

      expect(screen.getByText('+15.2%')).toBeInTheDocument()
      expect(screen.getByText('+82.3%')).toBeInTheDocument()
    })
  })

  describe('Risk Analysis Section', () => {
    it('should display position risk metrics', () => {
      renderComponent()

      expect(screen.getByText('Risk Analysis')).toBeInTheDocument()
      expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument()
      expect(screen.getByText('Sortino Ratio')).toBeInTheDocument()
    })

    it('should display position sizing chart', () => {
      renderComponent()

      expect(screen.getByText('Position Sizing')).toBeInTheDocument()
      const composedCharts = screen.getAllByTestId('composed-chart')
      expect(composedCharts.length).toBeGreaterThan(0)
    })
  })

  describe('Interactive Features', () => {
    it('should allow data export', () => {
      renderComponent()

      const exportButton = screen.getByText('Export')
      expect(exportButton).toBeInTheDocument()

      fireEvent.click(exportButton)
      // Should show export options
    })

    it('should refresh data on demand', () => {
      renderComponent()

      const refreshButton = screen.getByLabelText(/refresh/i)
      expect(refreshButton).toBeInTheDocument()

      fireEvent.click(refreshButton)
      // Should trigger data refresh
    })

    it('should navigate back to main portfolio', () => {
      const mockPush = jest.fn()
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: mockPush,
      })

      renderComponent()

      const backButton = screen.getByText('Back to Portfolio')
      fireEvent.click(backButton)

      expect(mockPush).toHaveBeenCalledWith('/portfolio')
    })
  })

  describe('Chart Interactions', () => {
    it('should handle chart hover tooltips', () => {
      renderComponent()

      // Charts should have tooltip components
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle empty data states', () => {
      renderComponent()

      // Should still render charts even with mock data
      const charts = screen.getAllByTestId(/chart/)
      expect(charts.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should render in mobile view', () => {
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      renderComponent()

      // Should still show main components
      expect(screen.getByText('Portfolio Analytics')).toBeInTheDocument()
    })

    it('should render in desktop view', () => {
      global.innerWidth = 1920
      global.dispatchEvent(new Event('resize'))

      renderComponent()

      // Should show all components
      expect(screen.getByText('Portfolio Analytics')).toBeInTheDocument()
      expect(screen.getAllByTestId(/chart/).length).toBeGreaterThan(0)
    })
  })
})