/**
 * WebSocket mock utilities for testing real-time features
 */

export class MockWebSocket {
  url: string
  readyState: number
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3

  constructor(url: string) {
    this.url = url
    this.readyState = this.CONNECTING
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = this.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== this.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Mock implementation - echo back for testing
    if (typeof data === 'string') {
      const parsedData = JSON.parse(data)
      // Simulate server response
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'response',
              ...parsedData
            })
          }))
        }
      }, 10)
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = this.CLOSING
    setTimeout(() => {
      this.readyState = this.CLOSED
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }))
      }
    }, 0)
  }

  // Test helper methods
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data)
      }))
    }
  }

  simulateError(error?: any) {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  simulateClose(code?: number, reason?: string) {
    this.readyState = this.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }
}

export const createMockWebSocket = () => {
  return MockWebSocket as any
}

export const mockWebSocketServer = {
  connections: new Set<MockWebSocket>(),
  
  broadcast(data: any) {
    this.connections.forEach(ws => {
      ws.simulateMessage(data)
    })
  },

  reset() {
    this.connections.clear()
  }
}