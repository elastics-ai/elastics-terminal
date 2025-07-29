import { renderHook, act, waitFor } from '@testing-library/react'
import WS from 'jest-websocket-mock'
import { 
  wsClient, 
  useWebSocket, 
  useWebSocketConnection,
  usePortfolioWebSocket,
  usePositionsWebSocket,
  useVolatilityWebSocket,
  useVolSurfaceWebSocket,
  useMarketDataWebSocket,
  useMultiChannelWebSocket
} from '@/lib/websocket'

// Mock WebSocket
const WS_URL = 'ws://localhost:8765'

describe.skip('WebSocket Client', () => {
  let server: WS

  beforeEach(async () => {
    // Create mock WebSocket server
    server = new WS(WS_URL, { jsonProtocol: true })
    
    // Reset client state
    wsClient.disconnect()
    await server.connected
  })

  afterEach(() => {
    wsClient.disconnect()
    WS.clean()
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      wsClient.connect(WS_URL)

      await server.connected
      expect(server).toHaveReceivedMessages([])
    })

    it('should handle connection message', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      // Send connection message from server
      server.send({
        type: 'connection',
        status: 'connected',
        client_id: 'test-client-123',
        message: 'Connected to server'
      })

      expect(wsClient.isConnected()).toBe(true)
    })

    it('should reconnect on disconnect', async () => {
      jest.useFakeTimers()
      
      wsClient.connect(WS_URL)
      await server.connected

      // Simulate disconnect
      server.close()

      // Fast forward reconnect timer
      jest.advanceTimersByTime(3000)

      // Should attempt reconnection
      await waitFor(() => {
        expect(wsClient.isConnected()).toBe(false)
      })

      jest.useRealTimers()
    })

    it('should handle multiple connect calls', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      // Second connect should not create new connection
      wsClient.connect(WS_URL)

      expect(server).toHaveReceivedMessages([])
    })
  })

  describe('Subscription Management', () => {
    it('should subscribe to events', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const callback = jest.fn()
      const unsubscribe = wsClient.subscribe('portfolio_update', callback)

      await expect(server).toReceiveMessage({
        type: 'subscribe',
        events: ['portfolio_update']
      })

      // Cleanup
      unsubscribe()
    })

    it('should handle subscription confirmation', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const callback = jest.fn()
      wsClient.subscribe('portfolio_update', callback)

      await expect(server).toReceiveMessage({
        type: 'subscribe',
        events: ['portfolio_update']
      })

      // Send confirmation
      server.send({
        type: 'subscription_confirmed',
        subscribed_events: ['portfolio_update']
      })
    })

    it('should route messages to correct handlers', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const portfolioCallback = jest.fn()
      const positionsCallback = jest.fn()

      wsClient.subscribe('portfolio_update', portfolioCallback)
      wsClient.subscribe('positions_update', positionsCallback)

      // Send portfolio update
      server.send({
        type: 'portfolio_update',
        timestamp: Date.now(),
        data: { total_value: 100000 }
      })

      expect(portfolioCallback).toHaveBeenCalledWith({
        type: 'portfolio_update',
        timestamp: expect.any(Number),
        data: { total_value: 100000 }
      })
      expect(positionsCallback).not.toHaveBeenCalled()
    })

    it('should unsubscribe from events', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const callback = jest.fn()
      const unsubscribe = wsClient.subscribe('test_event', callback)

      // Unsubscribe
      unsubscribe()

      await expect(server).toReceiveMessage({
        type: 'unsubscribe',
        events: ['test_event']
      })
    })

    it('should queue subscriptions before connection', async () => {
      const callback = jest.fn()
      
      // Subscribe before connecting
      wsClient.subscribe('test_event', callback)

      // Connect
      wsClient.connect(WS_URL)
      await server.connected

      // Should send queued subscription
      await expect(server).toReceiveMessage({
        type: 'subscribe',
        events: ['test_event']
      })
    })
  })

  describe('React Hooks', () => {
    describe('useWebSocket', () => {
      it('should subscribe to events', async () => {
        const callback = jest.fn()

        wsClient.connect(WS_URL)
        await server.connected

        renderHook(() => useWebSocket('test_event', callback))

        await expect(server).toReceiveMessage({
          type: 'subscribe',
          events: ['test_event']
        })

        // Send test message
        server.send({
          type: 'test_event',
          timestamp: Date.now(),
          data: { test: true }
        })

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'test_event',
            data: { test: true }
          })
        )
      })

      it('should cleanup on unmount', async () => {
        const callback = jest.fn()

        wsClient.connect(WS_URL)
        await server.connected

        const { unmount } = renderHook(() => useWebSocket('test_event', callback))

        await expect(server).toReceiveMessage({
          type: 'subscribe',
          events: ['test_event']
        })

        // Unmount
        unmount()

        await expect(server).toReceiveMessage({
          type: 'unsubscribe',
          events: ['test_event']
        })
      })
    })

    describe('useWebSocketConnection', () => {
      it('should track connection status', async () => {
        const { result } = renderHook(() => useWebSocketConnection())

        expect(result.current).toBe(false)

        act(() => {
          wsClient.connect(WS_URL)
        })

        await waitFor(() => {
          expect(result.current).toBe(true)
        })
      })
    })

    describe('usePortfolioWebSocket', () => {
      it('should handle portfolio updates', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const onUpdate = jest.fn()
        const { result } = renderHook(() => usePortfolioWebSocket(onUpdate))

        // Initially null
        expect(result.current).toBeNull()

        // Send portfolio update
        act(() => {
          server.send({
            type: 'portfolio_update',
            timestamp: Date.now(),
            data: {
              total_value: 2540300,
              total_pnl: 61024,
              total_pnl_percentage: 2.46,
              net_delta: 0.75,
              gamma: 0.002,
              vega: 125.5,
              theta: -450.2
            }
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual({
            total_value: 2540300,
            total_pnl: 61024,
            total_pnl_percentage: 2.46,
            net_delta: 0.75,
            gamma: 0.002,
            vega: 125.5,
            theta: -450.2
          })
        })

        expect(onUpdate).toHaveBeenCalled()
      })
    })

    describe('usePositionsWebSocket', () => {
      it('should handle positions updates', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const { result } = renderHook(() => usePositionsWebSocket())

        const positions = [
          {
            instrument: 'BTC-PERPETUAL',
            type: 'future',
            quantity: 10,
            entry_price: 45000,
            current_price: 52000,
            value: 520000,
            pnl: 70000,
            pnl_percentage: 15.56
          }
        ]

        act(() => {
          server.send({
            type: 'positions_update',
            timestamp: Date.now(),
            data: positions
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual(positions)
        })
      })
    })

    describe('useVolatilityWebSocket', () => {
      it('should handle volatility updates', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const { result } = renderHook(() => useVolatilityWebSocket())

        const volData = {
          timestamp: Date.now(),
          volatility: 0.0234,
          price: 52000,
          threshold: 0.02
        }

        act(() => {
          server.send({
            type: 'volatility_update',
            timestamp: Date.now(),
            data: volData
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual(volData)
        })
      })
    })

    describe('useVolSurfaceWebSocket', () => {
      it('should handle volatility surface updates', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const { result } = renderHook(() => useVolSurfaceWebSocket())

        const surfaceData = {
          spot_price: 52000,
          atm_vol: 68.5,
          options_count: 42,
          surface: {
            strikes: [45000, 50000, 55000],
            expiries: ['1W', '2W', '1M'],
            ivs: [[0.72, 0.68, 0.71], [0.70, 0.67, 0.69], [0.69, 0.66, 0.68]]
          }
        }

        act(() => {
          server.send({
            type: 'vol_surface_update',
            timestamp: Date.now(),
            data: surfaceData
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual(surfaceData)
        })
      })
    })

    describe('useMarketDataWebSocket', () => {
      it('should handle market data for specific symbol', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const { result } = renderHook(() => useMarketDataWebSocket('BTC'))

        const marketData = {
          symbol: 'BTC',
          price: 52345,
          volume: 1234567,
          change_24h: 2.45
        }

        act(() => {
          server.send({
            type: 'market_data_BTC',
            timestamp: Date.now(),
            data: marketData
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual(marketData)
        })
      })
    })

    describe('useMultiChannelWebSocket', () => {
      it('should handle multiple channels', async () => {
        wsClient.connect(WS_URL)
        await server.connected

        const onUpdate = jest.fn()
        const channels = ['portfolio_update', 'volatility_update']
        
        const { result } = renderHook(() => 
          useMultiChannelWebSocket(channels, onUpdate)
        )

        // Send updates for different channels
        act(() => {
          server.send({
            type: 'portfolio_update',
            timestamp: Date.now(),
            data: { total_value: 100000 }
          })
        })

        act(() => {
          server.send({
            type: 'volatility_update',
            timestamp: Date.now(),
            data: { volatility: 0.025 }
          })
        })

        await waitFor(() => {
          expect(result.current).toEqual({
            portfolio_update: { total_value: 100000 },
            volatility_update: { volatility: 0.025 }
          })
        })

        expect(onUpdate).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed messages', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const callback = jest.fn()
      wsClient.subscribe('test_event', callback)

      // Send malformed JSON
      server.send('invalid json')

      // Should not crash
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle connection errors', async () => {
      // Try to connect to non-existent server
      wsClient.connect('ws://localhost:9999')

      // Should handle error gracefully
      expect(wsClient.isConnected()).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should handle high message volume', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      const callback = jest.fn()
      wsClient.subscribe('high_freq_update', callback)

      // Send many messages rapidly
      for (let i = 0; i < 100; i++) {
        server.send({
          type: 'high_freq_update',
          timestamp: Date.now(),
          data: { index: i }
        })
      }

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(100)
      })
    })

    it('should batch subscription messages', async () => {
      wsClient.connect(WS_URL)
      await server.connected

      // Subscribe to multiple events at once
      const callbacks = Array(10).fill(0).map(() => jest.fn())
      const events = Array(10).fill(0).map((_, i) => `event_${i}`)

      events.forEach((event, i) => {
        wsClient.subscribe(event, callbacks[i])
      })

      // Should batch subscriptions
      const messages = await server.nextMessage
      expect(messages.events).toHaveLength(10)
    })
  })
})