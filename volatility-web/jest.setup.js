// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

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