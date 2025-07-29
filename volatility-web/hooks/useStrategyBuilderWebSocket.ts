/**
 * Custom hook for strategy builder WebSocket communication
 * Handles real-time updates between chat interface and flow builder
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from '@/components/ui/use-toast'

interface WebSocketMessage {
  type: string
  event_type?: string
  timestamp: string
  session_id?: string
  data: any
  message_id: string
  metadata?: {
    source: string
    version: string
    requires_ui_update: boolean
  }
}

interface StrategyBuilderEvent {
  type: 'strategy_created' | 'node_added' | 'node_updated' | 'nodes_connected' | 
        'code_generated' | 'chat_message_processed' | 'strategy_tested' | 'error_occurred'
  data: any
  timestamp: string
  sessionId?: string
}

interface UseStrategyBuilderWebSocketOptions {
  sessionId: string
  onStrategyEvent?: (event: StrategyBuilderEvent) => void
  onConnectionChange?: (connected: boolean) => void
  autoReconnect?: boolean
  reconnectDelay?: number
}

interface UseStrategyBuilderWebSocketReturn {
  isConnected: boolean
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastMessage: WebSocketMessage | null
  sendMessage: (message: any) => void
  subscribe: () => void
  unsubscribe: () => void
  getSessionState: () => void
}

export function useStrategyBuilderWebSocket({
  sessionId,
  onStrategyEvent,
  onConnectionChange,
  autoReconnect = true,
  reconnectDelay = 3000
}: UseStrategyBuilderWebSocketOptions): UseStrategyBuilderWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  
  // WebSocket connection function
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }
    
    setConnectionState('connecting')
    
    try {
      // Use secure WebSocket in production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('Strategy Builder WebSocket connected')
        setIsConnected(true)
        setConnectionState('connected')
        reconnectAttemptsRef.current = 0
        
        // Subscribe to strategy builder events
        subscribe()
        
        onConnectionChange?.(true)
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle strategy builder events
          if (message.type === 'strategy_builder_event' && message.event_type) {
            const strategyEvent: StrategyBuilderEvent = {
              type: message.event_type as any,
              data: message.data,
              timestamp: message.timestamp,
              sessionId: message.session_id
            }
            
            // Only process events for our session or global events
            if (!message.session_id || message.session_id === sessionId) {
              onStrategyEvent?.(strategyEvent)
              
              // Show toast notifications for important events
              handleEventNotification(strategyEvent)
            }
          }
          
          // Handle other message types
          else if (message.type === 'subscription_confirmed') {
            console.log('Strategy Builder subscription confirmed')
          }
          else if (message.type === 'session_state') {
            console.log('Received session state:', message.data)
          }
          else if (message.type === 'error') {
            console.error('WebSocket error:', message)
            toast({
              title: "Connection Error",
              description: "WebSocket error occurred",
              variant: "destructive"
            })
          }
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = (event) => {
        console.log('Strategy Builder WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setConnectionState('disconnected')
        onConnectionChange?.(false)
        
        // Attempt reconnection if enabled and not a normal closure
        if (autoReconnect && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay * reconnectAttemptsRef.current) // Exponential backoff
        }
      }
      
      wsRef.current.onerror = (error) => {
        console.error('Strategy Builder WebSocket error:', error)
        setConnectionState('error')
        
        toast({
          title: "Connection Error",
          description: "Failed to connect to strategy builder service",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setConnectionState('error')
    }
  }, [sessionId, onConnectionChange, onStrategyEvent, autoReconnect, reconnectDelay])
  
  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionState('disconnected')
    onConnectionChange?.(false)
  }, [onConnectionChange])
  
  // Send message function
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        session_id: sessionId
      }))
    } else {
      console.warn('WebSocket not connected, cannot send message')
      toast({
        title: "Connection Error",
        description: "Cannot send message - not connected",
        variant: "destructive"
      })
    }
  }, [sessionId])
  
  // Subscribe to strategy builder events
  const subscribe = useCallback(() => {
    sendMessage({
      type: 'subscribe_strategy_builder',
      session_id: sessionId
    })
  }, [sendMessage, sessionId])
  
  // Unsubscribe from events
  const unsubscribe = useCallback(() => {
    sendMessage({
      type: 'unsubscribe_strategy_builder',
      session_id: sessionId
    })
  }, [sendMessage, sessionId])
  
  // Get current session state
  const getSessionState = useCallback(() => {
    sendMessage({
      type: 'get_session_state',
      session_id: sessionId
    })
  }, [sendMessage, sessionId])
  
  // Handle event notifications
  const handleEventNotification = useCallback((event: StrategyBuilderEvent) => {
    switch (event.type) {
      case 'strategy_created':
        toast({
          title: "Strategy Created",
          description: `${event.data.strategy_name} with ${event.data.node_count} nodes`
        })
        break
        
      case 'node_added':
        toast({
          title: "Node Added",
          description: `${event.data.node.type} node added to flow`
        })
        break
        
      case 'code_generated':
        if (event.data.generation_status === 'success') {
          toast({
            title: "Code Generated",
            description: "AI generated code for node"
          })
        } else {
          toast({
            title: "Code Generation Failed",
            description: "Failed to generate code for node",
            variant: "destructive"
          })
        }
        break
        
      case 'strategy_tested':
        const success = event.data.test_status === 'completed' && event.data.success_rate > 0.5
        toast({
          title: success ? "Strategy Test Passed" : "Strategy Test Issues",
          description: `Success rate: ${(event.data.success_rate * 100).toFixed(1)}%`,
          variant: success ? "default" : "destructive"
        })
        break
        
      case 'error_occurred':
        toast({
          title: "Strategy Builder Error",
          description: event.data.error_message || "An error occurred",
          variant: "destructive"
        })
        break
    }
  }, [])
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    isConnected,
    connectionState,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    getSessionState
  }
}

// Additional hook for ping/heartbeat functionality
export function useWebSocketHeartbeat(
  sendMessage: (message: any) => void,
  isConnected: boolean,
  interval: number = 30000
) {
  useEffect(() => {
    if (!isConnected) return
    
    const heartbeat = setInterval(() => {
      sendMessage({ type: 'ping' })
    }, interval)
    
    return () => clearInterval(heartbeat)
  }, [sendMessage, isConnected, interval])
}

// Hook for WebSocket connection status indicator
export function useConnectionStatus() {
  const [status, setStatus] = useState<'online' | 'offline'>('online')
  
  useEffect(() => {
    const handleOnline = () => setStatus('online')
    const handleOffline = () => setStatus('offline')
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return status
}