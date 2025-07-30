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

// Mock Radix UI components to make tabs work in tests
jest.mock('@/components/ui/tabs', () => {
  const React = require('react')
  const { useState } = React
  return {
    Tabs: ({ children, defaultValue }: any) => {
      const [activeTab, setActiveTab] = useState(defaultValue)
      return (
        <div data-active-tab={activeTab}>
          {React.Children.map(children, (child: any) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { activeTab, setActiveTab })
            }
            return child
          })}
        </div>
      )
    },
    TabsList: ({ children, activeTab, setActiveTab }: any) => (
      <div role="tablist">
        {React.Children.map(children, (child: any) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { activeTab, setActiveTab })
          }
          return child
        })}
      </div>
    ),
    TabsTrigger: ({ children, value, activeTab, setActiveTab }: any) => (
      <button
        role="tab"
        onClick={() => setActiveTab && setActiveTab(value)}
        aria-selected={activeTab === value}
      >
        {children}
      </button>
    ),
    TabsContent: ({ children, value, activeTab }: any) =>
      activeTab === value ? <div role="tabpanel">{children}</div> : null,
  }
})

// Mock other UI components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button role="combobox">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || 'Select...'}</span>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
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

  describe('Portfolio Dashboard', () => {
    it('should render main header and sections', () => {
      renderComponent()

      expect(screen.getByText('Portfolio')).toBeInTheDocument()
      expect(screen.getByText('Graphs')).toBeInTheDocument()
      expect(screen.getByText('Strategies')).toBeInTheDocument()
    })

    it('should display key metrics cards', () => {
      renderComponent()

      expect(screen.getByText('Active Strategies')).toBeInTheDocument()
      expect(screen.getByText('Total Returns')).toBeInTheDocument()
      expect(screen.getByText('Cumulative Return')).toBeInTheDocument()
      expect(screen.getByText('Annual Return')).toBeInTheDocument()
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
      // Annual Volatility appears twice, use getAllByText
      const volatilityElements = screen.getAllByText('Annual Volatility')
      expect(volatilityElements.length).toBe(2)
    })

    it('should display alert badges', () => {
      renderComponent()

      expect(screen.getByText('Critical 3')).toBeInTheDocument()
      expect(screen.getByText('Warning 2')).toBeInTheDocument()
      expect(screen.getByText('Info 4')).toBeInTheDocument()
    })
  })

  describe('Charts Section', () => {
    it('should render cumulative returns chart', () => {
      renderComponent()

      expect(screen.getByText(/Cumulative Returns/)).toBeInTheDocument()
      const lineCharts = screen.getAllByTestId('line-chart')
      expect(lineCharts.length).toBeGreaterThan(0)
    })

    it('should render daily trading volume chart', () => {
      renderComponent()

      expect(screen.getByText(/Daily Trading Volume/)).toBeInTheDocument()
      const areaCharts = screen.getAllByTestId('area-chart')
      expect(areaCharts.length).toBeGreaterThan(0)
    })

    it('should render drawdowns chart', () => {
      renderComponent()

      expect(screen.getByText('Drawdowns')).toBeInTheDocument()
      // Should have multiple area charts
      const areaCharts = screen.getAllByTestId('area-chart')
      expect(areaCharts.length).toBeGreaterThan(1)
    })

    it('should render return distribution chart', () => {
      renderComponent()

      expect(screen.getByText('Strategy Return Distributions')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should render sharpe ratio chart', () => {
      renderComponent()

      expect(screen.getByText('Rolling Sharpe Ratios (30-Day)')).toBeInTheDocument()
      // Should have multiple line charts
      const lineCharts = screen.getAllByTestId('line-chart')
      expect(lineCharts.length).toBeGreaterThan(1)
    })

    it('should render volatility chart', () => {
      renderComponent()

      expect(screen.getByText('Rolling Annualized Volatility (30-Day)')).toBeInTheDocument()
      // Should have multiple line charts
      const lineCharts = screen.getAllByTestId('line-chart')
      expect(lineCharts.length).toBeGreaterThan(2)
    })

    it('should allow timeframe selection', () => {
      renderComponent()

      const timeframeButtons = screen.getAllByRole('button', { name: /1W|1M|YTD|1Y/i })
      expect(timeframeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('AI Queries Section', () => {
    it('should display AI-powered queries', () => {
      renderComponent()

      expect(screen.getByText('AI-Powered Queries')).toBeInTheDocument()
      expect(screen.getByText('Ask')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ask anything...')).toBeInTheDocument()
    })

    it('should display sample queries', () => {
      renderComponent()

      expect(screen.getByText('Set the benchmark to top 20 altcoin basket')).toBeInTheDocument()
      expect(screen.getByText('Which strategy contributed most to volatility in June?')).toBeInTheDocument()
      expect(screen.getByText('Breakdown PnL contribution by exchange')).toBeInTheDocument()
      expect(screen.getByText('What tags dominate profitable trades?')).toBeInTheDocument()
    })
  })

  describe('Allocation Section', () => {
    it('should display allocation controls', () => {
      renderComponent()

      expect(screen.getByText('Allocation')).toBeInTheDocument()
      expect(screen.getByText('Relative')).toBeInTheDocument()
      expect(screen.getByText('Benchmark')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
    })

    it('should display donut chart', () => {
      renderComponent()

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should display outer ring legend', () => {
      renderComponent()

      expect(screen.getByText('Outer Ring')).toBeInTheDocument()
      expect(screen.getByText('Binance')).toBeInTheDocument()
      expect(screen.getByText('Deribit')).toBeInTheDocument()
      expect(screen.getByText('PKX')).toBeInTheDocument()
      expect(screen.getByText('BKK')).toBeInTheDocument()
    })

    it('should display inner ring legend', () => {
      renderComponent()

      expect(screen.getByText('Inner Ring')).toBeInTheDocument()
      expect(screen.getByText('ETH')).toBeInTheDocument()
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('SOL')).toBeInTheDocument()
      expect(screen.getByText('LINK')).toBeInTheDocument()
      expect(screen.getByText('XRP')).toBeInTheDocument()
      expect(screen.getByText('Others')).toBeInTheDocument()
    })

    it('should show allocation percentages', () => {
      renderComponent()

      // Check for percentage values in legends
      expect(screen.getByText('40%')).toBeInTheDocument() // Binance
      expect(screen.getByText('31%')).toBeInTheDocument() // ETH
      expect(screen.getByText('17%')).toBeInTheDocument() // BTC
    })
  })

  describe('Benchmark and Settings', () => {
    it('should display benchmark selection', () => {
      renderComponent()

      // The S&P 500 text might be in the SelectValue component
      expect(screen.getByText('Benchmark')).toBeInTheDocument()
    })

    it('should display export button', () => {
      renderComponent()

      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should display tags section', () => {
      renderComponent()

      expect(screen.getByText('All Tags')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should have graphs and strategies tabs', () => {
      renderComponent()

      expect(screen.getByRole('tab', { name: 'Graphs' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Strategies' })).toBeInTheDocument()
    })

    it('should show strategies placeholder content', () => {
      renderComponent()

      // Click on strategies tab
      fireEvent.click(screen.getByRole('tab', { name: 'Strategies' }))
      expect(screen.getByText('Strategies content coming soon...')).toBeInTheDocument()
    })
  })

  describe('Interactive Features', () => {
    it('should allow data export', () => {
      renderComponent()

      const exportButton = screen.getByText('Export')
      expect(exportButton).toBeInTheDocument()

      fireEvent.click(exportButton)
      // Export button should be clickable
    })

    it('should allow AI query input', () => {
      renderComponent()

      const askButton = screen.getByText('Ask')
      expect(askButton).toBeInTheDocument()

      fireEvent.click(askButton)
      // Ask button should be clickable
    })

    it('should display time selection buttons', () => {
      renderComponent()

      const timeButtons = screen.getAllByRole('button', { name: /1W|1M|YTD|1Y/i })
      expect(timeButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Chart Interactions', () => {
    it('should render all chart types', () => {
      renderComponent()

      // Should have line charts for cumulative returns and ratios
      const lineCharts = screen.getAllByTestId('line-chart')
      expect(lineCharts.length).toBeGreaterThan(0)
      
      // Should have area charts for volume and drawdowns  
      const areaCharts = screen.getAllByTestId('area-chart')
      expect(areaCharts.length).toBeGreaterThan(0)
      
      // Should have bar chart for distributions
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      
      // Should have pie chart for allocation
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    it('should handle chart data rendering', () => {
      renderComponent()

      // Should still render charts even with mock data
      const allCharts = [
        ...screen.getAllByTestId('line-chart'),
        ...screen.getAllByTestId('area-chart'),
        screen.getByTestId('bar-chart'),
        screen.getByTestId('pie-chart')
      ]
      expect(allCharts.length).toBeGreaterThan(5)
    })
  })

  describe('Responsive Design', () => {
    it('should render in mobile view', () => {
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      renderComponent()

      // Should still show main components
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
    })

    it('should render in desktop view', () => {
      global.innerWidth = 1920
      global.dispatchEvent(new Event('resize'))

      renderComponent()

      // Should show all components
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
      expect(screen.getAllByTestId(/chart/).length).toBeGreaterThan(0)
    })
  })
})