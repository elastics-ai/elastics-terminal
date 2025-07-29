export interface WebSocketMessage {
  type: string
  timestamp: number
  data: any
}

export interface VolatilityData {
  timestamp: number
  volatility: number
  price: number
  threshold: number
}

export interface PositionData {
  instrument: string
  type: string
  quantity: number
  entry_price: number
  current_price: number
  value: number
  pnl: number
  pnl_percentage: number
  delta?: number
  iv?: number
}

export interface PortfolioSummary {
  total_positions: number
  total_value: number
  total_pnl: number
  total_pnl_percentage: number
  net_delta: number
  absolute_delta: number
  gamma: number
  vega: number
  theta: number
}

export interface VolSurfaceData {
  spot_price: number
  atm_vol: number
  options_count: number
  surface: {
    strikes: number[]
    expiries: string[]
    ivs: number[][]
  }
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map()
  private messageQueue: any[] = []
  private isConnecting = false
  private clientId: string | null = null

  connect(url?: string) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return

    // Use dynamic hostname if no URL provided
    if (!url) {
      // Check for environment variable first
      if (process.env.NEXT_PUBLIC_WS_URL) {
        url = process.env.NEXT_PUBLIC_WS_URL
      } else {
        // Fall back to dynamic hostname detection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const hostname = window.location.hostname
        url = `${protocol}//${hostname}:8765`
      }
    }

    this.isConnecting = true
    
    try {
      this.ws = new WebSocket(url)
      
      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to:', url)
        this.isConnecting = false
        // Process any queued messages first
        this.processMessageQueue()
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          // Handle connection message
          if (message.type === 'connection' && message.client_id) {
            this.clientId = message.client_id
            console.log('Client ID:', this.clientId)
            // Resubscribe to all events after connection
            this.resubscribeAll()
          }
          
          // Handle subscription confirmation
          else if (message.type === 'subscription_confirmed') {
            console.log('Subscriptions confirmed:', message.subscribed_events)
          }
          
          // Handle data messages
          else {
            const handlers = this.subscriptions.get(message.type)
            if (handlers) {
              console.log(`[WebSocket] Received ${message.type} event, notifying ${handlers.size} handlers`)
              handlers.forEach(handler => handler(message))
            } else {
              console.log(`[WebSocket] Received ${message.type} event but no handlers registered`)
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.ws = null
        this.clientId = null
        
        // Attempt to reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect(url)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      this.isConnecting = false
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.clientId = null
  }

  subscribe(event: string, callback: (data: any) => void) {
    console.log(`[WebSocket] Subscribing to event: ${event}`)
    
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set())
    }
    this.subscriptions.get(event)!.add(callback)

    // Send subscription message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket] Sending subscription for: ${event}`)
      this.sendMessage({
        type: 'subscribe',
        events: [event]
      })
    } else {
      console.log(`[WebSocket] Queueing subscription for: ${event} (not connected yet)`)
      // Queue the subscription to be sent when connected
      this.messageQueue.push({
        type: 'subscribe',
        events: [event]
      })
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(event)
      if (handlers) {
        handlers.delete(callback)
        if (handlers.size === 0) {
          this.subscriptions.delete(event)
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.sendMessage({
              type: 'unsubscribe',
              events: [event]
            })
          }
        }
      }
    }
  }

  private resubscribeAll() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    
    const events = Array.from(this.subscriptions.keys())
    if (events.length > 0) {
      this.sendMessage({
        type: 'subscribe',
        events: events
      })
    }
  }

  private sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false
  }
}

export const wsClient = new WebSocketClient()

// Custom hooks for React components
import { useEffect, useState, useCallback, useRef } from 'react'

export function useWebSocket<T = any>(event: string, callback: (data: T) => void) {
  const memoizedCallback = useCallback(callback, [callback])
  
  useEffect(() => {
    const unsubscribe = wsClient.subscribe(event, memoizedCallback)
    return unsubscribe
  }, [event, memoizedCallback])
}

export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsClient.isConnected())
    }

    // Check initial connection
    checkConnection()

    // Set up interval to check connection status
    const interval = setInterval(checkConnection, 1000)

    return () => clearInterval(interval)
  }, [])

  return isConnected
}

// Enhanced hooks for specific data channels
export function usePortfolioWebSocket(onUpdate?: (data: PortfolioSummary) => void) {
  const [portfolioData, setPortfolioData] = useState<PortfolioSummary | null>(null)
  
  useWebSocket<WebSocketMessage>('portfolio_update', (message) => {
    if (message.data) {
      setPortfolioData(message.data)
      onUpdate?.(message.data)
    }
  })
  
  return portfolioData
}

export function usePositionsWebSocket(onUpdate?: (data: PositionData[]) => void) {
  const [positions, setPositions] = useState<PositionData[]>([])
  
  useWebSocket<WebSocketMessage>('positions_update', (message) => {
    if (message.data) {
      setPositions(message.data)
      onUpdate?.(message.data)
    }
  })
  
  return positions
}

export function useVolatilityWebSocket(onUpdate?: (data: VolatilityData) => void) {
  const [volatilityData, setVolatilityData] = useState<VolatilityData | null>(null)
  
  useWebSocket<WebSocketMessage>('volatility_update', (message) => {
    if (message.data) {
      setVolatilityData(message.data)
      onUpdate?.(message.data)
    }
  })
  
  return volatilityData
}

export function useVolSurfaceWebSocket(onUpdate?: (data: VolSurfaceData) => void) {
  const [surfaceData, setSurfaceData] = useState<VolSurfaceData | null>(null)
  
  useWebSocket<WebSocketMessage>('vol_surface_update', (message) => {
    if (message.data) {
      setSurfaceData(message.data)
      onUpdate?.(message.data)
    }
  })
  
  return surfaceData
}

export function useMarketDataWebSocket(symbol: string, onUpdate?: (data: any) => void) {
  const [marketData, setMarketData] = useState<any>(null)
  
  useWebSocket<WebSocketMessage>(`market_data_${symbol}`, (message) => {
    if (message.data) {
      setMarketData(message.data)
      onUpdate?.(message.data)
    }
  })
  
  return marketData
}

// Hook for subscribing to multiple channels
export function useMultiChannelWebSocket(channels: string[], onUpdate?: (channel: string, data: any) => void) {
  const dataRef = useRef<Record<string, any>>({})
  const [data, setData] = useState<Record<string, any>>({})
  
  useEffect(() => {
    const unsubscribes = channels.map(channel => 
      wsClient.subscribe(channel, (message: WebSocketMessage) => {
        if (message.data) {
          dataRef.current = { ...dataRef.current, [channel]: message.data }
          setData({ ...dataRef.current })
          onUpdate?.(channel, message.data)
        }
      })
    )
    
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [channels, onUpdate])
  
  return data
}