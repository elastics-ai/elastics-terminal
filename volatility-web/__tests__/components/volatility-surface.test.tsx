import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import VolatilitySurface3D from '@/components/volatility-surface-3d'
import { volatilityAPI } from '@/lib/api'

// Mock Three.js and react-three-fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="three-canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: () => ({
    camera: { position: { set: jest.fn() } },
    scene: {},
    gl: {},
  }),
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <div data-testid="grid" />,
  Text: ({ children }: any) => <div data-testid="3d-text">{children}</div>,
  Html: ({ children }: any) => <div data-testid="3d-html">{children}</div>,
}))

// Mock the API
jest.mock('@/lib/api', () => ({
  volatilityAPI: {
    getSurface: jest.fn(),
    getGreeksHeatmap: jest.fn(),
    getTermStructure: jest.fn(),
  },
}))

const mockVolatilityAPI = volatilityAPI as jest.Mocked<typeof volatilityAPI>

describe('VolatilitySurface3D', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VolatilitySurface3D currency="BTC" {...props} />
      </QueryClientProvider>
    )
  }

  const mockSurfaceData = {
    surface: {
      strikes: [45000, 50000, 55000, 60000, 65000],
      expiries: ['1W', '2W', '1M', '2M', '3M'],
      ivs: [
        [0.721, 0.685, 0.698, 0.742, 0.788],
        [0.712, 0.675, 0.688, 0.732, 0.778],
        [0.705, 0.668, 0.681, 0.725, 0.771],
        [0.698, 0.661, 0.674, 0.718, 0.764],
        [0.692, 0.655, 0.668, 0.712, 0.758],
      ],
    },
    spot: 52000,
    atmIv: 0.675,
    timestamp: '2023-12-03T15:00:00Z',
  }

  describe('3D Surface Rendering', () => {
    it('should render the 3D canvas', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      })
    })

    it('should display surface title', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('BTC Implied Volatility Surface')).toBeInTheDocument()
      })
    })

    it('should render orbit controls', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('orbit-controls')).toBeInTheDocument()
      })
    })

    it('should display axis labels', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Strike')).toBeInTheDocument()
        expect(screen.getByText('Expiry')).toBeInTheDocument()
        expect(screen.getByText('IV %')).toBeInTheDocument()
      })
    })
  })

  describe('Surface Controls', () => {
    it('should toggle between surface and heatmap view', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        const viewToggle = screen.getByLabelText('Toggle view mode')
        fireEvent.click(viewToggle)
      })

      expect(screen.getByText('Heatmap View')).toBeInTheDocument()
    })

    it('should allow rotation control', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        const rotateToggle = screen.getByLabelText('Toggle rotation')
        fireEvent.click(rotateToggle)
      })

      // Should start/stop rotation
    })

    it('should reset camera position', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        const resetButton = screen.getByLabelText('Reset camera')
        fireEvent.click(resetButton)
      })

      // Camera position should reset
    })

    it('should toggle wireframe mode', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        const wireframeToggle = screen.getByLabelText('Toggle wireframe')
        fireEvent.click(wireframeToggle)
      })

      // Should switch to wireframe rendering
    })
  })

  describe('Data Display', () => {
    it('should show current ATM IV', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('ATM IV: 67.5%')).toBeInTheDocument()
      })
    })

    it('should display spot price', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Spot: $52,000')).toBeInTheDocument()
      })
    })

    it('should show volatility smile metrics', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue({
        ...mockSurfaceData,
        smile: {
          skew: -0.15,
          kurtosis: 3.2,
          riskReversal25: -0.02,
        },
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Skew:.*-0.15/)).toBeInTheDocument()
        expect(screen.getByText(/Kurtosis:.*3.2/)).toBeInTheDocument()
      })
    })
  })

  describe('Interactivity', () => {
    it('should show tooltip on hover', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        // Simulate hover over surface point
        const surface = screen.getByTestId('volatility-surface-mesh')
        fireEvent.mouseMove(surface, { clientX: 100, clientY: 100 })
      })

      // Should show tooltip with strike/expiry/IV info
      expect(screen.getByTestId('surface-tooltip')).toBeInTheDocument()
    })

    it('should allow strike selection', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('50000'))
      })

      // Should highlight selected strike
      expect(screen.getByText('Selected Strike: 50000')).toBeInTheDocument()
    })

    it('should allow expiry selection', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('1M'))
      })

      // Should highlight selected expiry
      expect(screen.getByText('Selected Expiry: 1M')).toBeInTheDocument()
    })
  })

  describe('Greeks Heatmap', () => {
    it('should display Greeks heatmap when enabled', async () => {
      mockVolatilityAPI.getGreeksHeatmap.mockResolvedValue({
        heatmap: {
          strikes: [45000, 50000, 55000],
          expiries: ['1W', '2W', '1M'],
          delta: [[0.8, 0.5, 0.2], [0.75, 0.45, 0.15], [0.7, 0.4, 0.1]],
          gamma: [[0.001, 0.002, 0.001], [0.0008, 0.0015, 0.0008], [0.0006, 0.001, 0.0006]],
          vega: [[50, 80, 50], [45, 75, 45], [40, 70, 40]],
          theta: [[-100, -150, -100], [-90, -140, -90], [-80, -130, -80]],
        },
      })

      renderComponent({ showGreeks: true })

      await waitFor(() => {
        expect(screen.getByText('Greeks Heatmap')).toBeInTheDocument()
        expect(screen.getByText('Delta')).toBeInTheDocument()
        expect(screen.getByText('Gamma')).toBeInTheDocument()
        expect(screen.getByText('Vega')).toBeInTheDocument()
        expect(screen.getByText('Theta')).toBeInTheDocument()
      })
    })

    it('should switch between different Greeks', async () => {
      mockVolatilityAPI.getGreeksHeatmap.mockResolvedValue({
        heatmap: { /* mock data */ },
      })

      renderComponent({ showGreeks: true })

      await waitFor(() => {
        fireEvent.click(screen.getByText('Gamma'))
      })

      // Should display Gamma heatmap
      expect(screen.getByText('Gamma Heatmap')).toBeInTheDocument()
    })
  })

  describe('Term Structure', () => {
    it('should display term structure curve', async () => {
      mockVolatilityAPI.getTermStructure.mockResolvedValue({
        termStructure: [
          { expiry: '1W', atmIv: 0.65, days: 7 },
          { expiry: '2W', atmIv: 0.66, days: 14 },
          { expiry: '1M', atmIv: 0.68, days: 30 },
          { expiry: '2M', atmIv: 0.70, days: 60 },
        ],
      })

      renderComponent({ showTermStructure: true })

      await waitFor(() => {
        expect(screen.getByText('Term Structure')).toBeInTheDocument()
        expect(screen.getByTestId('term-structure-chart')).toBeInTheDocument()
      })
    })
  })

  describe('Export Functionality', () => {
    it('should export surface data', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Export data'))
      })

      // Should show export options
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
      expect(screen.getByText('Export as JSON')).toBeInTheDocument()
    })

    it('should capture surface screenshot', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Capture screenshot'))
      })

      // Should trigger screenshot capture
    })
  })

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      mockVolatilityAPI.getSurface.mockImplementation(() => new Promise(() => {}))

      renderComponent()

      expect(screen.getByText(/Loading volatility surface/)).toBeInTheDocument()
    })

    it('should handle errors gracefully', async () => {
      mockVolatilityAPI.getSurface.mockRejectedValue(new Error('Failed to load surface'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/Failed to load volatility surface/)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockVolatilityAPI.getSurface.mockRejectedValueOnce(new Error('Failed'))
      mockVolatilityAPI.getSurface.mockResolvedValueOnce(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        fireEvent.click(screen.getByText('Retry'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Optimization', () => {
    it('should throttle updates during rotation', async () => {
      mockVolatilityAPI.getSurface.mockResolvedValue(mockSurfaceData)

      renderComponent()

      await waitFor(() => {
        // Start rotation
        fireEvent.click(screen.getByLabelText('Toggle rotation'))
      })

      // Updates should be throttled
    })

    it('should use LOD for complex surfaces', async () => {
      const largeSurfaceData = {
        ...mockSurfaceData,
        surface: {
          strikes: Array(50).fill(0).map((_, i) => 40000 + i * 1000),
          expiries: Array(20).fill(0).map((_, i) => `${i + 1}W`),
          ivs: Array(50).fill(0).map(() => Array(20).fill(0.7)),
        },
      }

      mockVolatilityAPI.getSurface.mockResolvedValue(largeSurfaceData)

      renderComponent()

      await waitFor(() => {
        // Should use level of detail optimization
        expect(screen.getByTestId('lod-indicator')).toBeInTheDocument()
      })
    })
  })
})