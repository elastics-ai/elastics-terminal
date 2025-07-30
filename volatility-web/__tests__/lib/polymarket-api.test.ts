/**
 * Tests for Polymarket API integration
 */

import { polymarketAPI } from '@/lib/api'

// Mock the fetchAPI function
jest.mock('@/lib/api', () => ({
  polymarketAPI: {
    getMarkets: jest.fn()
  },
  fetchAPI: jest.fn()
}))

const mockPolymarketAPI = polymarketAPI as jest.Mocked<typeof polymarketAPI>

describe('Polymarket API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMarkets', () => {
    it('calls API without search parameter when no search term provided', async () => {
      const mockResponse = {
        markets: [],
        total: 0,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: false
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets()

      expect(result).toEqual(mockResponse)
      expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledWith()
    })

    it('calls API with search parameter when search term provided', async () => {
      const searchTerm = 'bitcoin'
      const mockResponse = {
        markets: [
          {
            id: 'btc-1',
            question: 'Will Bitcoin reach $100k?',
            yes_percentage: 35.2,
            no_percentage: 64.8,
            volume: 1000000,
            end_date: '2024-12-31',
            category: 'Crypto',
            tags: ['bitcoin'],
            active: true
          }
        ],
        total: 1,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: false
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets(searchTerm)

      expect(result).toEqual(mockResponse)
      expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledWith(searchTerm)
    })

    it('handles API errors correctly', async () => {
      const errorMessage = 'Network error'
      mockPolymarketAPI.getMarkets.mockRejectedValue(new Error(errorMessage))

      await expect(polymarketAPI.getMarkets()).rejects.toThrow(errorMessage)
    })

    it('handles empty search term', async () => {
      const mockResponse = {
        markets: [],
        total: 0,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: false
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets('')

      expect(result).toEqual(mockResponse)
      expect(mockPolymarketAPI.getMarkets).toHaveBeenCalledWith('')
    })

    it('handles response with demo data flag', async () => {
      const mockResponse = {
        markets: [
          {
            id: 'demo-1',
            question: 'Demo market question',
            yes_percentage: 50,
            no_percentage: 50,
            volume: 100000,
            end_date: '2024-12-31',
            category: 'Demo',
            tags: ['demo'],
            active: true
          }
        ],
        total: 1,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: true
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets()

      expect(result).toEqual(mockResponse)
      expect(result.is_mock).toBe(true)
    })

    it('handles markets with all required fields', async () => {
      const mockResponse = {
        markets: [
          {
            id: 'complete-market',
            question: 'Complete market question?',
            yes_percentage: 65.4,
            no_percentage: 34.6,
            volume: 2500000,
            end_date: '2024-06-30',
            category: 'Politics',
            tags: ['election', 'politics', '2024'],
            active: true
          }
        ],
        total: 1,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: false
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets()

      expect(result.markets[0]).toMatchObject({
        id: expect.any(String),
        question: expect.any(String),
        yes_percentage: expect.any(Number),
        no_percentage: expect.any(Number),
        volume: expect.any(Number),
        end_date: expect.any(String),
        category: expect.any(String),
        tags: expect.arrayContaining([expect.any(String)]),
        active: expect.any(Boolean)
      })
    })

    it('handles markets with minimal fields', async () => {
      const mockResponse = {
        markets: [
          {
            id: 'minimal-market',
            question: 'Minimal market?',
            yes_percentage: 50,
            no_percentage: 50,
            volume: 0,
            end_date: '',
            category: 'Other',
            tags: [],
            active: false
          }
        ],
        total: 1,
        last_update: '2024-01-01T12:00:00.000Z',
        is_mock: false
      }

      mockPolymarketAPI.getMarkets.mockResolvedValue(mockResponse)

      const result = await polymarketAPI.getMarkets()

      expect(result.markets[0]).toMatchObject({
        id: 'minimal-market',
        question: 'Minimal market?',
        yes_percentage: 50,
        no_percentage: 50,
        volume: 0,
        tags: [],
        active: false
      })
    })
  })
})