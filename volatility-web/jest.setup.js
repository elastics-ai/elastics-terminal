// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Set up React Query for tests - must be imported before components
import { QueryClient } from '@tanstack/react-query'

// Create a global test query client with consistent configuration
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries in all tests
      retryDelay: 0,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 0,
      cacheTime: 0,
      suspense: false,
      useErrorBoundary: false,
    },
    mutations: {
      retry: false,
      retryDelay: 0,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress React Query error logs in tests
  },
})

// Override console.error to suppress act() warnings in test environment
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {
    // Trigger the callback with a mock entry
    this.callback([
      {
        contentRect: {
          width: 800,
          height: 600,
        },
      },
    ])
  }
  unobserve() {}
  disconnect() {}
}

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Mock WebSocket completely to avoid timeout issues
jest.mock('@/lib/websocket', () => ({
  useWebSocketConnection: jest.fn(() => false),
  useDashboardWebSocket: jest.fn(() => ({
    data: null,
    isConnected: false,
    error: null
  })),
  usePortfolioAnalyticsWebSocket: jest.fn(() => null),
  useNewsWebSocket: jest.fn(() => null),
  useAIInsightsWebSocket: jest.fn(() => null),
  wsClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
    isConnected: jest.fn(() => false),
    send: jest.fn(),
    close: jest.fn()
  }
}))

// Mock the WebSocket constructor globally to prevent connection attempts
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 3, // CLOSED
  CLOSED: 3,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2
}))

// Increase default test timeout for integration tests
jest.setTimeout(10000)

// Mock fetch globally with comprehensive API responses
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      portfolio_analytics: {
        portfolio_value: 2540300,
        cumulative_pnl: 91024.18,
        cumulative_return: 5.86,
        annual_return: 14.2,
        max_drawdown: -8.5,
        annual_volatility: 24.3,
        net_delta: 2.55,
        net_vega: 19.5,
        var_95: 8750,
        beta: 0.85,
        alpha: 0.024,
      },
      performance_history: [],
      asset_allocation: {
        'BTC': 45.2,
        'ETH': 32.1,
        'Options': 15.7,
        'Cash': 7.0,
      },
      news_feed: [],
      ai_insights: [],
    }),
    text: () => Promise.resolve('{}'),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
  })
)

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Mock Three.js globally for all tests that need 3D rendering
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    background: null,
    add: jest.fn()
  })),
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
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() }
  })),
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
  GridHelper: jest.fn(() => ({
    position: { y: 0 }
  })),
  Float32BufferAttribute: jest.fn(),
  DoubleSide: 'DoubleSide'
}))

// Mock OrbitControls globally
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

// Mock Recharts globally for all chart components
jest.mock('recharts', () => {
  const React = require('react')
  return {
    ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'chart-container' }, children),
    LineChart: ({ children }) => React.createElement('div', { 'data-testid': 'line-chart' }, children),
    PieChart: ({ children }) => React.createElement('div', { 'data-testid': 'pie-chart' }, children),
    AreaChart: ({ children }) => React.createElement('div', { 'data-testid': 'area-chart' }, children),
    BarChart: ({ children }) => React.createElement('div', { 'data-testid': 'bar-chart' }, children),
    Line: () => React.createElement('div', { 'data-testid': 'line' }),
    Area: () => React.createElement('div', { 'data-testid': 'area' }),
    Pie: () => React.createElement('div', { 'data-testid': 'pie' }),
    Bar: () => React.createElement('div', { 'data-testid': 'bar' }),
    Cell: () => React.createElement('div', { 'data-testid': 'cell' }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
    Legend: () => React.createElement('div', { 'data-testid': 'legend' }),
    ReferenceLine: () => React.createElement('div', { 'data-testid': 'reference-line' })
  }
})