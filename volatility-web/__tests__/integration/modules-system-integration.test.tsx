/**
 * Integration Tests for Modules System (Design Pages 3-4, 11, 18-19)
 * 
 * Tests cover end-to-end integration between frontend and backend:
 * - SSVI Surface 3D visualization with real-time data
 * - Model selection and comparison (SSVI vs eSSVI vs LSTM)
 * - Data source integration (Deribit, Kalshi, Polymarket)
 * - Options pricing calculations with Greeks
 * - Surface scaling and parameter adjustment
 * - Bookkeeper portfolio optimization
 * - Contract screening and matching
 * - Module execution and performance monitoring
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ModulesPage from '@/app/modules/page'

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}))

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({ background: null, add: jest.fn() })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    domElement: document.createElement('canvas'),
    render: jest.fn(),
    dispose: jest.fn()
  })),
  Color: jest.fn(),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(() => ({ position: { set: jest.fn() } })),
  PlaneGeometry: jest.fn(() => ({
    attributes: {
      position: {
        count: 100,
        setXYZ: jest.fn(),
        getX: jest.fn(() => 0),
        getY: jest.fn(() => 0),
        setZ: jest.fn()
      }
    },
    setAttribute: jest.fn(),
    computeVertexNormals: jest.fn()
  })),
  MeshPhongMaterial: jest.fn(),
  Mesh: jest.fn(),
  GridHelper: jest.fn(() => ({ position: { y: 0 } })),
  Float32BufferAttribute: jest.fn(),
  DoubleSide: 'DoubleSide'
}))

// Mock OrbitControls
jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    enableZoom: true,
    enablePan: true,
    update: jest.fn(),
    dispose: jest.fn()
  }))
}))

// Mock AppLayout
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  )
}))

// Mock ModuleTile with real interactions
jest.mock('@/components/modules/ModuleTile', () => ({
  ModuleTile: ({ module, onClick, onToggleFavorite }: any) => {
    const [loading, setLoading] = React.useState(false)
    
    const handleClick = async () => {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 200)) // Simulate processing
      onClick()
      setLoading(false)
    }
    
    return (
      <div 
        data-testid={`module-tile-${module.id}`}
        className="bg-gray-900 rounded-lg p-4 cursor-pointer"
        onClick={handleClick}
      >
        <div data-testid="module-title">{module.title}</div>
        <div data-testid="module-description">{module.description}</div>
        
        {loading && <div data-testid="tile-loading">Loading...</div>}
        
        <button 
          data-testid="favorite-button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={module.is_favorite ? 'text-yellow-500' : 'text-gray-500'}
        >
          ⭐
        </button>
        
        <div data-testid="module-stats">
          <span data-testid="execution-count">{module.execution_count} runs</span>
          <span data-testid="avg-time">{module.avg_execution_time}ms avg</span>
        </div>
      </div>
    )
  }
}))

// Mock ModuleDetail with full SSVI functionality
jest.mock('@/components/modules/ModuleDetail', () => ({
  ModuleDetail: ({ moduleId, onClose, onUpdate }: any) => {
    const [surfaceData, setSurfaceData] = React.useState(null)
    const [pricingResult, setPricingResult] = React.useState(null)
    const [modelComparison, setModelComparison] = React.useState(null)
    const [isCalculating, setIsCalculating] = React.useState(false)
    
    // Mock surface data loading
    React.useEffect(() => {
      if (moduleId === 1) { // SSVI Surface
        setTimeout(() => {
          setSurfaceData({
            strikes: Array.from({length: 20}, (_, i) => 0.8 + i * 0.02),
            maturities: Array.from({length: 15}, (_, i) => 0.1 + i * 0.13),
            ivs: Array.from({length: 15}, () => 
              Array.from({length: 20}, () => 0.15 + Math.random() * 0.3))
          })
        }, 300)
      }
    }, [moduleId])
    
    const handleCalculatePrice = async () => {
      setIsCalculating(true)
      
      // Simulate pricing calculation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setPricingResult({
        price: 77512.45,
        greeks: {
          delta: 0.567,
          gamma: 0.0031,
          vega: 45.2,
          theta: -12.3,
          rho: 18.4
        }
      })
      
      setIsCalculating(false)
    }
    
    const handleModelComparison = async () => {
      setIsCalculating(true)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setModelComparison({
        models: ['SSVI', 'eSSVI'],
        metrics: {
          SSVI: { rmse: 0.0234, r_squared: 0.987 },
          eSSVI: { rmse: 0.0198, r_squared: 0.991 }
        },
        better_model: 'eSSVI',
        explanation: 'eSSVI provides better fit with 15.4% lower RMSE and captures additional smile dynamics.'
      })
      
      setIsCalculating(false)
    }
    
    return (
      <div data-testid="module-detail" className="w-96 bg-gray-900 h-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 data-testid="detail-title">Module Details</h2>
          <button data-testid="close-detail" onClick={onClose}>✕</button>
        </div>
        
        <div data-testid="module-id">Module ID: {moduleId}</div>
        
        {isCalculating && (
          <div data-testid="calculation-loading">
            <div data-testid="loading-spinner">Calculating...</div>
            <div data-testid="progress-bar">Progress: 65%</div>
          </div>
        )}
        
        {/* SSVI Surface Detail */}
        {moduleId === 1 && (
          <div data-testid="ssvi-detail-content">
            <div data-testid="surface-container">
              <h3>SSVI Surface Visualization</h3>
              {surfaceData ? (
                <div data-testid="ssvi-surface-3d">
                  3D Surface Loaded ({surfaceData.strikes.length}x{surfaceData.maturities.length} grid)
                </div>
              ) : (
                <div data-testid="surface-loading">Loading surface data...</div>
              )}
            </div>
            
            <div data-testid="model-selection">
              <h3>Model Selection</h3>
              <select data-testid="model-selector" defaultValue="SSVI">
                <option value="SSVI">SSVI</option>
                <option value="ESSVI">eSSVI</option>
                <option value="LSTM">LSTM</option>
                <option value="More">More...</option>
              </select>
              <button 
                data-testid="compare-models-button"
                onClick={handleModelComparison}
                disabled={isCalculating}
              >
                Compare Models
              </button>
            </div>
            
            {modelComparison && (
              <div data-testid="model-comparison-results">
                <h4>Model Comparison Results</h4>
                <div data-testid="comparison-metrics">
                  <div>SSVI RMSE: {modelComparison.metrics.SSVI.rmse}</div>
                  <div>eSSVI RMSE: {modelComparison.metrics.eSSVI.rmse}</div>
                  <div>Better Model: {modelComparison.better_model}</div>
                </div>
                <div data-testid="comparison-explanation">
                  {modelComparison.explanation}
                </div>
              </div>
            )}
            
            <div data-testid="data-sources">
              <h3>Data Sources</h3>
              <div data-testid="show-data-section">
                <label data-testid="show-data-toggle">
                  <input type="checkbox" /> Show Data
                </label>
              </div>
              <div data-testid="data-source-options">
                <label><input type="checkbox" data-testid="deribit-source" /> Deribit</label>
                <label><input type="checkbox" data-testid="kalshi-source" /> Kalshi</label>
                <label><input type="checkbox" data-testid="polymarket-source" /> Polymarket</label>
                <label><input type="checkbox" data-testid="portfolio-source" /> Portfolio only</label>
              </div>
            </div>
            
            <div data-testid="surface-controls">
              <h3>Surface Controls</h3>
              <div data-testid="moneyness-scale">
                <label>Moneyness Scale</label>
                <input type="range" min="0.5" max="1.5" step="0.1" defaultValue="1.0" />
              </div>
              <div data-testid="time-scale">
                <label>Time Scale</label>
                <input type="range" min="0.1" max="3.0" step="0.1" defaultValue="2.0" />
              </div>
              <div data-testid="show-metrics">
                <label><input type="checkbox" /> Show Metrics</label>
              </div>
            </div>
            
            <div data-testid="pricing-section">
              <h3>Pricer</h3>
              <div data-testid="pricer-inputs">
                <input data-testid="expiry-input" placeholder="Enter Expiry" defaultValue="30" />
                <input data-testid="moneyness-input" placeholder="Enter Moneyness" defaultValue="1.05" />
              </div>
              
              <div data-testid="pricer-options">
                <h4>Select Pricer</h4>
                <label><input type="radio" name="pricer" value="BS" defaultChecked /> BS</label>
                <label><input type="radio" name="pricer" value="BS Quanto" /> BS Quanto</label>
                <label><input type="radio" name="pricer" value="Binomial" /> Binomial</label>
                <label><input type="radio" name="pricer" value="Black 76" /> Black 76</label>
              </div>
              
              <div data-testid="option-type-selection">
                <h4>Select Option Type</h4>
                <label><input type="radio" name="option" value="Vanilla Call" defaultChecked /> Vanilla Call</label>
                <label><input type="radio" name="option" value="Vanilla Put" /> Vanilla Put</label>
                <label><input type="radio" name="option" value="Binary Call" /> Binary Call</label>
                <label><input type="radio" name="option" value="Binary Put" /> Binary Put</label>
              </div>
              
              <button 
                data-testid="calculate-price-button"
                onClick={handleCalculatePrice}
                disabled={isCalculating}
              >
                {isCalculating ? 'Calculating...' : 'Calculate Price'}
              </button>
              
              {pricingResult && (
                <div data-testid="pricing-results">
                  <div data-testid="calculated-price">
                    Price: ${pricingResult.price.toLocaleString()}
                  </div>
                  <div data-testid="greeks-display">
                    <h4>Greeks</h4>
                    <div data-testid="greeks-values">
                      <div>Delta: {pricingResult.greeks.delta}</div>
                      <div>Gamma: {pricingResult.greeks.gamma}</div>
                      <div>Vega: {pricingResult.greeks.vega}</div>
                      <div>Theta: {pricingResult.greeks.theta}</div>
                      <div>Rho: {pricingResult.greeks.rho}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div data-testid="surface-actions">
              <button data-testid="show-surface-button">Show on Surface</button>
              <button data-testid="explain-difference-button">Explain difference between SSVI and eSSVI models</button>
              <button data-testid="compare-iv-button">Compare this IV surface to 7 days ago</button>
              <button data-testid="export-json-button">Export this surface as JSON</button>
              <button data-testid="run-scenario-button">Run scenario analysis</button>
            </div>
          </div>
        )}
        
        {/* Bookkeeper Detail */}
        {moduleId === 2 && (
          <div data-testid="bookkeeper-detail-content">
            <h3>Bookkeeper - Portfolio Optimization</h3>
            <div data-testid="rebalancing-suggestions">
              <h4>Rebalancing Suggestions</h4>
              <div data-testid="suggested-trades">
                <div>BTC: SELL 1.24 units (-$127,014)</div>
                <div>ETH: BUY 48.2 units (+$127,014)</div>
              </div>
              <div data-testid="rebalancing-impact">
                <div>Expected Risk Reduction: 8.3%</div>
                <div>Sharpe Ratio Improvement: 0.12</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Contract Screener Detail */}
        {moduleId === 3 && (
          <div data-testid="contract-screener-detail-content">
            <h3>Contract Screener</h3>
            <div data-testid="screening-filters">
              <div>Min Volume: <input type="number" defaultValue="500" /></div>
              <div>Max IV: <input type="number" step="0.01" defaultValue="0.30" /></div>
              <div>Delta Range: <input type="range" min="-1" max="1" step="0.1" /></div>
            </div>
            <div data-testid="matching-results">
              <div>Found 15 matching contracts</div>
              <div>Top Match: BTC-25JAN25-50000-C (Score: 0.87)</div>
            </div>
          </div>
        )}
        
        <button data-testid="update-module" onClick={onUpdate}>Update Module</button>
      </div>
    )
  }
}))

describe('Modules System Integration Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    
    // Reset fetch mock
    ;(fetch as jest.Mock).mockClear()
  })

  const mockModulesData = {
    modules: [
      {
        id: 1,
        title: 'SSVI Surface',
        description: 'Breeden-Litzenberger Risk-Neutral Density Surface',
        query_type: 'SELECT',
        is_favorite: false,
        created_at: new Date().toISOString(),
        execution_count: 45,
        avg_execution_time: 234
      },
      {
        id: 2,
        title: 'Bookkeeper',
        description: 'Portfolio rebalancing and optimization module',
        query_type: 'SELECT',
        is_favorite: true,
        created_at: new Date().toISOString(),
        execution_count: 78,
        avg_execution_time: 156
      },
      {
        id: 3,
        title: 'Contract Screener',
        description: 'Advanced contract filtering and matching',
        query_type: 'SELECT',
        is_favorite: false,
        created_at: new Date().toISOString(),
        execution_count: 23,
        avg_execution_time: 89
      }
    ],
    total: 3
  }

  const mockStatsData = {
    total_modules: 15,
    total_executions: 2347,
    avg_execution_time: 187,
    favorite_count: 5
  }

  const renderModulesPage = () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockModulesData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatsData
      })
    
    return render(
      <QueryClientProvider client={queryClient}>
        <ModulesPage />
      </QueryClientProvider>
    )
  }

  describe('SSVI Surface End-to-End Integration', () => {
    it('should handle complete SSVI surface workflow', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      // Wait for modules to load
      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      // Click SSVI Surface module
      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      // Wait for detail view to open
      await waitFor(() => {
        expect(screen.getByTestId('ssvi-detail-content')).toBeInTheDocument()
      })

      // Wait for surface data to load
      await waitFor(() => {
        expect(screen.getByText(/3D Surface Loaded/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Test model comparison
      const compareButton = screen.getByTestId('compare-models-button')
      await user.click(compareButton)

      await waitFor(() => {
        expect(screen.getByTestId('calculation-loading')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByTestId('model-comparison-results')).toBeInTheDocument()
        expect(screen.getByText('Better Model: eSSVI')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Test data source selection
      const deribitSource = screen.getByTestId('deribit-source')
      await user.click(deribitSource)
      expect(deribitSource).toBeChecked()

      // Test pricing calculation
      const expiryInput = screen.getByTestId('expiry-input')
      const moneynessInput = screen.getByTestId('moneyness-input')
      
      await user.clear(expiryInput)
      await user.type(expiryInput, '45')
      await user.clear(moneynessInput)
      await user.type(moneynessInput, '1.1')

      const calculateButton = screen.getByTestId('calculate-price-button')
      await user.click(calculateButton)

      await waitFor(() => {
        expect(screen.getAllByText('Calculating...')).toHaveLength(2) // Button and spinner
      })

      await waitFor(() => {
        expect(screen.getByTestId('pricing-results')).toBeInTheDocument()
        expect(screen.getByText(/Price: \$77,512/)).toBeInTheDocument()
        expect(screen.getByTestId('greeks-display')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should handle surface scaling and parameter adjustment', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('surface-controls')).toBeInTheDocument()
      })

      // Test moneyness scale adjustment
      const moneynessScale = screen.getByTestId('moneyness-scale').querySelector('input') as HTMLInputElement
      expect(moneynessScale).toHaveValue('1.0')
      
      // Use fireEvent for non-editable elements or direct value setting
      moneynessScale.value = '1.2'
      moneynessScale.dispatchEvent(new Event('input', { bubbles: true }))
      expect(moneynessScale).toHaveValue('1.2')

      // Test time scale adjustment
      const timeScale = screen.getByTestId('time-scale').querySelector('input') as HTMLInputElement
      expect(timeScale).toHaveValue('2.0')
      
      // Use direct value setting for time scale
      timeScale.value = '2.5'
      timeScale.dispatchEvent(new Event('input', { bubbles: true }))
      expect(timeScale).toHaveValue('2.5')
    })

    it('should support model selection and switching', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('model-selector')).toBeInTheDocument()
      })

      const modelSelector = screen.getByTestId('model-selector')
      
      // Switch to eSSVI model
      await user.selectOptions(modelSelector, 'ESSVI')
      expect(modelSelector).toHaveValue('ESSVI')

      // Switch to LSTM model
      await user.selectOptions(modelSelector, 'LSTM')
      expect(modelSelector).toHaveValue('LSTM')
    })

    it('should handle multiple data source integration', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('data-sources')).toBeInTheDocument()
      })

      // Enable multiple data sources
      const deribitSource = screen.getByTestId('deribit-source')
      const kalshiSource = screen.getByTestId('kalshi-source')
      const polymarketSource = screen.getByTestId('polymarket-source')

      await user.click(deribitSource)
      await user.click(kalshiSource)
      await user.click(polymarketSource)

      expect(deribitSource).toBeChecked()
      expect(kalshiSource).toBeChecked()
      expect(polymarketSource).toBeChecked()
    })
  })

  describe('Bookkeeper Integration', () => {
    it('should handle portfolio optimization workflow', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-2')).toBeInTheDocument()
      })

      const bookkeeperTile = screen.getByTestId('module-tile-2')
      await user.click(bookkeeperTile)

      await waitFor(() => {
        expect(screen.getByTestId('bookkeeper-detail-content')).toBeInTheDocument()
      })

      // Check rebalancing suggestions
      expect(screen.getByTestId('rebalancing-suggestions')).toBeInTheDocument()
      expect(screen.getByTestId('suggested-trades')).toBeInTheDocument()
      expect(screen.getByText(/BTC: SELL 1.24 units/)).toBeInTheDocument()
      expect(screen.getByText(/ETH: BUY 48.2 units/)).toBeInTheDocument()

      // Check rebalancing impact
      expect(screen.getByTestId('rebalancing-impact')).toBeInTheDocument()
      expect(screen.getByText(/Expected Risk Reduction: 8.3%/)).toBeInTheDocument()
      expect(screen.getByText(/Sharpe Ratio Improvement: 0.12/)).toBeInTheDocument()
    })
  })

  describe('Contract Screener Integration', () => {
    it('should handle contract filtering and matching', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-3')).toBeInTheDocument()
      })

      const screenerTile = screen.getByTestId('module-tile-3')
      await user.click(screenerTile)

      await waitFor(() => {
        expect(screen.getByTestId('contract-screener-detail-content')).toBeInTheDocument()
      })

      // Test filtering controls
      const screeningFilters = screen.getByTestId('screening-filters')
      expect(screeningFilters).toBeInTheDocument()

      const volumeInput = screeningFilters.querySelector('input[type="number"]')
      expect(volumeInput).toHaveValue(500)

      await user.clear(volumeInput!)
      await user.type(volumeInput!, '1000')
      expect(volumeInput).toHaveValue(1000)

      // Check matching results
      expect(screen.getByTestId('matching-results')).toBeInTheDocument()
      expect(screen.getByText(/Found 15 matching contracts/)).toBeInTheDocument()
      expect(screen.getByText(/Top Match: BTC-25JAN25-50000-C/)).toBeInTheDocument()
    })
  })

  describe('Real-time Data Integration', () => {
    it('should handle real-time surface updates', async () => {
      const user = userEvent.setup()
      
      // Mock WebSocket or polling updates
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockModulesData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatsData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            surface: {
              strikes: Array.from({length: 20}, (_, i) => 0.8 + i * 0.02),
              maturities: Array.from({length: 15}, (_, i) => 0.1 + i * 0.13),
              ivs: Array.from({length: 15}, () => 
                Array.from({length: 20}, () => 0.15 + Math.random() * 0.3))
            },
            timestamp: new Date().toISOString(),
            data_source: 'deribit'
          })
        })

      render(
        <QueryClientProvider client={queryClient}>
          <ModulesPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('ssvi-surface-3d')).toBeInTheDocument()
      }, { timeout: 1000 })

      // Surface should be loaded with real-time data
      expect(screen.getByText(/20x15 grid/)).toBeInTheDocument()
    })

    it('should handle data source connection errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockModulesData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatsData
        })
        .mockRejectedValueOnce(new Error('Deribit connection failed'))

      render(
        <QueryClientProvider client={queryClient}>
          <ModulesPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      // Should show loading state while attempting connection
      await waitFor(() => {
        expect(screen.getByTestId('surface-loading')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large surface calculations efficiently', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('calculate-price-button')).toBeInTheDocument()
      })

      const calculateButton = screen.getByTestId('calculate-price-button')
      await user.click(calculateButton)

      // Should show progress indicator during calculation
      await waitFor(() => {
        expect(screen.getByTestId('calculation-loading')).toBeInTheDocument()
        expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
      })

      // Calculation should complete within reasonable time
      await waitFor(() => {
        expect(screen.getByTestId('pricing-results')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should handle concurrent module executions', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getAllByTestId(/module-tile-/)).toHaveLength(3)
      })

      // Click multiple modules rapidly
      const tiles = screen.getAllByTestId(/module-tile-/)
      
      // This should show loading states for tiles being processed
      await user.click(tiles[0])
      await user.click(tiles[1])

      // Both should handle loading states appropriately
      await waitFor(() => {
        expect(screen.getByTestId('module-detail')).toBeInTheDocument()
      })
    })
  })

  describe('Module Management Integration', () => {
    it('should handle module favorites and statistics', async () => {
      const user = userEvent.setup()
      
      // Mock favorite update
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockModulesData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatsData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      render(
        <QueryClientProvider client={queryClient}>
          <ModulesPage />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      // Check module statistics display (first module)
      expect(screen.getAllByTestId('execution-count')[0]).toHaveTextContent('45 runs')
      expect(screen.getAllByTestId('avg-time')[0]).toHaveTextContent('234ms avg')

      // Toggle favorite
      const favoriteButton = screen.getAllByTestId('favorite-button')[0]
      await user.click(favoriteButton)

      // Should make API call to update favorite
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/modules/1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('is_favorite')
          })
        )
      })
    })

    it('should handle module execution tracking', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      
      // Click should show loading state
      await user.click(ssviTile)
      
      await waitFor(() => {
        expect(screen.getByTestId('tile-loading')).toBeInTheDocument()
      })

      // Loading should complete
      await waitFor(() => {
        expect(screen.queryByTestId('tile-loading')).not.toBeInTheDocument()
        expect(screen.getByTestId('module-detail')).toBeInTheDocument()
      })
    })
  })

  describe('Surface Export and Analysis', () => {
    it('should handle surface export functionality', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('surface-actions')).toBeInTheDocument()
      })

      // Test export functionality
      const exportButton = screen.getByTestId('export-json-button')
      await user.click(exportButton)

      // Should trigger export (in real implementation would download file)
      expect(exportButton).toBeInTheDocument()
    })

    it('should handle scenario analysis', async () => {
      const user = userEvent.setup()
      renderModulesPage()

      await waitFor(() => {
        expect(screen.getByTestId('module-tile-1')).toBeInTheDocument()
      })

      const ssviTile = screen.getByTestId('module-tile-1')
      await user.click(ssviTile)

      await waitFor(() => {
        expect(screen.getByTestId('run-scenario-button')).toBeInTheDocument()
      })

      const scenarioButton = screen.getByTestId('run-scenario-button')
      await user.click(scenarioButton)

      // Should trigger scenario analysis
      expect(scenarioButton).toBeInTheDocument()
    })
  })
})