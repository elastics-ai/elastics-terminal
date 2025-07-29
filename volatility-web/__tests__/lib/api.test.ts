import { fetchAPI, chatAPI, portfolioAPI, volatilityAPI, polymarketAPI, statsAPI } from '@/lib/api'

// Mock fetch globally
global.fetch = jest.fn()

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window.location for tests
    delete (window as any).location
    ;(window as any).location = {
      protocol: 'http:',
      hostname: 'localhost',
    }
  })

  describe('fetchAPI', () => {
    test('constructs correct URL with default localhost', async () => {
      const mockResponse = { data: 'test' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await fetchAPI('/api/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      expect(result).toEqual(mockResponse)
    })

    test('uses current hostname when not localhost', async () => {
      ;(window as any).location.hostname = '192.168.1.100'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      await fetchAPI('/api/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.1.100:8000/api/test',
        expect.any(Object)
      )
    })

    test('throws error on non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(fetchAPI('/api/test')).rejects.toThrow('API error: 404 Not Found')
    })

    test('passes custom options to fetch', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      })

      await fetchAPI('/api/test', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
        headers: {
          'X-Custom-Header': 'test',
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test',
          },
        })
      )
    })
  })

  describe('chatAPI', () => {
    test('sendMessage sends POST request with content', async () => {
      const mockResponse = { response: 'Test response', timestamp: '2024-01-15T10:00:00Z' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await chatAPI.sendMessage({ content: 'Test message' })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat/send',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        })
      )
      expect(result).toEqual(mockResponse)
    })

    test('getSuggestions sends GET request', async () => {
      const mockSuggestions = { suggestions: ['Question 1', 'Question 2'] }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestions,
      })

      const result = await chatAPI.getSuggestions()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/chat/suggestions',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      expect(result).toEqual(mockSuggestions)
    })
  })

  describe('portfolioAPI', () => {
    test('getSummary fetches portfolio summary', async () => {
      const mockSummary = { total_value: 100000, total_pnl: 5000 }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      })

      const result = await portfolioAPI.getSummary()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/portfolio/summary',
        expect.any(Object)
      )
      expect(result).toEqual(mockSummary)
    })

    test('getPositions fetches portfolio positions', async () => {
      const mockPositions = [{ instrument: 'BTC-CALL', pnl: 1000 }]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPositions,
      })

      const result = await portfolioAPI.getPositions()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/portfolio/positions',
        expect.any(Object)
      )
      expect(result).toEqual(mockPositions)
    })

    test('getPnLBreakdown fetches P&L breakdown', async () => {
      const mockBreakdown = { options: 1000, futures: -500, total: 500 }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBreakdown,
      })

      const result = await portfolioAPI.getPnLBreakdown()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/portfolio/pnl-breakdown',
        expect.any(Object)
      )
      expect(result).toEqual(mockBreakdown)
    })
  })

  describe('volatilityAPI', () => {
    test('getAlerts fetches volatility alerts with default limit', async () => {
      const mockAlerts = [{ timestamp: 1234567890, volatility: 0.5 }]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      })

      const result = await volatilityAPI.getAlerts()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/volatility/alerts?limit=10',
        expect.any(Object)
      )
      expect(result).toEqual(mockAlerts)
    })

    test('getAlerts fetches volatility alerts with custom limit', async () => {
      const mockAlerts = [{ timestamp: 1234567890, volatility: 0.5 }]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      })

      const result = await volatilityAPI.getAlerts(20)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/volatility/alerts?limit=20',
        expect.any(Object)
      )
      expect(result).toEqual(mockAlerts)
    })

    test('getLatestSurface fetches volatility surface data', async () => {
      const mockSurface = { timestamp: 1234567890, surface_data: [] }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSurface,
      })

      const result = await volatilityAPI.getLatestSurface()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/volatility/surface/latest',
        expect.any(Object)
      )
      expect(result).toEqual(mockSurface)
    })
  })

  describe('polymarketAPI', () => {
    test('getMarkets fetches markets without search', async () => {
      const mockMarkets = { markets: [], total: 0 }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarkets,
      })

      const result = await polymarketAPI.getMarkets()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/polymarket/markets',
        expect.any(Object)
      )
      expect(result).toEqual(mockMarkets)
    })

    test('getMarkets fetches markets with search query', async () => {
      const mockMarkets = { markets: [], total: 0 }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarkets,
      })

      const result = await polymarketAPI.getMarkets('bitcoin')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/polymarket/markets?search=bitcoin',
        expect.any(Object)
      )
      expect(result).toEqual(mockMarkets)
    })
  })

  describe('statsAPI', () => {
    test('getRealtime fetches realtime stats', async () => {
      const mockStats = { total_trades: 100, avg_volatility: 0.5 }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      })

      const result = await statsAPI.getRealtime()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/stats/realtime',
        expect.any(Object)
      )
      expect(result).toEqual(mockStats)
    })
  })

  describe('Error handling', () => {
    test('handles network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(chatAPI.sendMessage('test')).rejects.toThrow('Network error')
    })

    test('handles JSON parsing errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(chatAPI.sendMessage('test')).rejects.toThrow('Invalid JSON')
    })
  })
})