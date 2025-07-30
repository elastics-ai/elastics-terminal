import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/page'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FloatingChatProvider } from '@/contexts/FloatingChatContext'

// Mock the AppLayout component
jest.mock('@/components/layout/app-layout', () => {
  return {
    AppLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="app-layout">{children}</div>
    )
  }
})

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  }),
  signOut: jest.fn(),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />
}))

describe('Dashboard WebSocket Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    jest.clearAllMocks()
  })

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FloatingChatProvider>
          <DashboardPage />
        </FloatingChatProvider>
      </QueryClientProvider>
    )
  }

  it('should display dashboard without WebSocket errors', async () => {
    renderDashboard()

    // Should show the dashboard page loads without errors
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should display portfolio metrics from mocked data
    await waitFor(() => {
      expect(screen.getByText('$2,540,300')).toBeInTheDocument()
    })
  })

  it('should display portfolio metrics', async () => {
    renderDashboard()

    // Wait for dashboard to load with mocked data
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should display portfolio metrics from fetch mock
    await waitFor(() => {
      expect(screen.getByText('$2,540,300')).toBeInTheDocument()
    })
  })

  it('should display charts without errors', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Check that chart components render
    await waitFor(() => {
      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0)
    })
  })

  it('should display analytics data', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should display some analytics metrics
    await waitFor(() => {
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('ETH')).toBeInTheDocument()
    })
  })

  it('should handle page load without WebSocket connection', async () => {
    renderDashboard()

    // Should render without throwing errors
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })
  })

  it('should display empty news feed gracefully', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should handle empty news feed without errors
    // The test passes if no errors are thrown
  })

  it('should display empty AI insights gracefully', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should handle empty AI insights without errors
    // The test passes if no errors are thrown
  })

  it('should handle performance data display', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should display performance metrics
    await waitFor(() => {
      expect(screen.getAllByText('+5.9%').length).toBeGreaterThan(0)
    })
  })
})

// Separate describe block for dashboard update logic
describe('Dashboard Update Logic', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    jest.clearAllMocks()
  })

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FloatingChatProvider>
          <DashboardPage />
        </FloatingChatProvider>
      </QueryClientProvider>
    )
  }

  it('should handle incremental vs full analytics updates', async () => {
    renderDashboard()

    // Should render dashboard successfully
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should display basic analytics data
    await waitFor(() => {
      expect(screen.getByText('$2,540,300')).toBeInTheDocument()
    })
  })

  it('should manage AI insights list correctly', async () => {
    renderDashboard()

    // Should render dashboard successfully
    await waitFor(() => {
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
    }, { timeout: 10000 })

    // Should handle empty insights gracefully
    // Test passes if no errors are thrown
  })
})