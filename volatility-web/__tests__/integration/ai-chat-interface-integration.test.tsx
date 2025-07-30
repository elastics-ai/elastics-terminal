/**
 * Integration Tests for AI Chat Interface (Design Page 2)
 * 
 * Tests cover end-to-end integration between frontend and backend:
 * - Multi-query analysis workflow
 * - Real-time AI response handling
 * - Context preservation across queries
 * - Financial data integration
 * - Suggestion system integration
 * - Error recovery and resilience
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ChatPage from '@/app/chat/page'

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

// Mock AppLayout
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  )
}))

// Mock ChatInterface with realistic behavior
jest.mock('@/components/bloomberg/views/chat/chat-interface', () => ({
  ChatInterface: ({ messages, onSendMessage, setMessages, onSuggestionClick }: any) => {
    const [input, setInput] = React.useState('')
    const [isLoading, setIsLoading] = React.useState(false)
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return
      
      setIsLoading(true)
      const content = input.trim()
      setInput('')
      onSendMessage(content)
      
      // Simulate AI processing with fetch response
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        })
        
        if (response.ok) {
          const data = await response.json()
          // Simulate AI response message by directly updating messages
          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: data.response,
            timestamp: new Date()
          }
          setMessages((prev: any) => [...prev, assistantMessage])
        }
        setIsLoading(false)
      } catch (error) {
        console.error('Chat API error:', error)
        setIsLoading(false)
      }
    }
    
    return (
      <div data-testid="chat-interface">
        <div data-testid="messages-container">
          {messages.map((msg: any) => (
            <div key={msg.id} data-testid={`message-${msg.role}`}>
              <div data-testid="message-content">{msg.content}</div>
              <div data-testid="message-timestamp">{msg.timestamp.toISOString()}</div>
            </div>
          ))}
          
          {isLoading && (
            <div data-testid="loading-indicator">
              <span>Processing...</span>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} data-testid="chat-form">
          <textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about ETH performance, market patterns, or data analysis..."
          />
          <button 
            type="submit"
            data-testid="send-button"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Send Query'}
          </button>
        </form>
        
        <div data-testid="suggestions-panel">
          <h3>Suggested Follow-ups</h3>
          <button 
            data-testid="suggestion-1"
            onClick={() => onSuggestionClick?.("Show me the specific timestamps of these leveraging outliers")}
          >
            Show me the specific timestamps of these leveraging outliers
          </button>
          <button 
            data-testid="suggestion-2"
            onClick={() => onSuggestionClick?.("Generate backtesting results for a nighttime-focused strategy")}
          >
            Generate backtesting results for a nighttime-focused strategy
          </button>
          <button 
            data-testid="suggestion-3"
            onClick={() => onSuggestionClick?.("Compare these patterns with BTC and other major cryptocurrencies")}
          >
            Compare these patterns with BTC and other major cryptocurrencies
          </button>
        </div>
        
        <div data-testid="analysis-results">
          <div data-testid="performance-chart">
            <h4>ETH Performance Analysis</h4>
            <div data-testid="chart-data">Performance data visualization</div>
          </div>
          
          <div data-testid="statistical-summary">
            <h4>Statistical Summary</h4>
            <div data-testid="stats-content">Statistical analysis results</div>
          </div>
        </div>
      </div>
    )
  }
}))

describe('AI Chat Interface Integration Tests', () => {
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

  const renderChatPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ChatPage />
      </QueryClientProvider>
    )
  }

  describe('Multi-Query Analysis Workflow', () => {
    it('should handle complex financial analysis queries end-to-end', async () => {
      const user = userEvent.setup()
      
      // Mock API responses for multi-query workflow
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: `Based on historical ETH data analysis, here are the key findings:

**Daytime vs Nighttime Performance Patterns:**
- Daytime trading (9 AM - 5 PM EST) shows 12% higher volatility on average
- Nighttime sessions exhibit 8% higher returns during bullish periods
- Cumulative performance diverges significantly during high-volatility periods

**Statistical Significance:**
- P-value for daytime/nighttime difference: 0.0023 (highly significant)
- Sharpe ratio improvement: 0.34 for nighttime-focused strategies`,
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 101,
            suggestions: [
              'Show me the specific timestamps of these leveraging outliers',
              'Generate backtesting results for a nighttime-focused strategy'
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: `Here are the specific leveraging outlier events:

**Extreme Leveraging Events (>5 sigma):**
1. 2024-01-15 23:42:18 UTC - 847% above mean leverage
2. 2024-01-03 01:15:33 UTC - 623% above mean leverage
3. 2024-01-28 22:08:47 UTC - 589% above mean leverage

**Temporal Patterns:**
- 78% of outliers occur during nighttime sessions (10 PM - 2 AM EST)
- Peak outlier frequency: 11:30 PM - 1:30 AM EST
- Correlation with futures expiry dates: 0.67`,
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 102,
            suggestions: [
              'Generate backtesting results for these outlier patterns',
              'Set up real-time alerts for similar events'
            ]
          })
        })

      renderChatPage()

      // Wait for initial system message
      await waitFor(() => {
        expect(screen.getByTestId('message-system')).toBeInTheDocument()
      })

      // First query: Complex ETH performance analysis
      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Show me historical ETH performance vs daytime vs nighttime transactions over time. What are the highest-leveraging outliers.")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
        expect(screen.getByText('AI is analyzing your query...')).toBeInTheDocument()
      })

      // Wait for AI response
      await waitFor(() => {
        expect(screen.getByText(/Daytime vs Nighttime Performance Patterns/)).toBeInTheDocument()
        expect(screen.getByText(/12% higher volatility on average/)).toBeInTheDocument()
        expect(screen.getByText(/P-value for daytime\/nighttime difference: 0.0023/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Second query: Follow-up for outlier details
      const suggestionButton = screen.getByTestId('suggestion-1')
      await user.click(suggestionButton)

      // Wait for second response
      await waitFor(() => {
        expect(screen.getByText(/Extreme Leveraging Events/)).toBeInTheDocument()
        expect(screen.getByText(/2024-01-15 23:42:18 UTC/)).toBeInTheDocument()
        expect(screen.getByText(/78% of outliers occur during nighttime/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify API calls were made correctly
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenNthCalledWith(1, 'http://localhost:8000/api/chat/send', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('historical ETH performance')
      }))
    })

    it('should preserve context across multiple queries', async () => {
      const user = userEvent.setup()
      
      // Mock contextual responses
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'ETH shows significant patterns. Let me analyze the data...',
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 201
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'Based on your previous ETH analysis, here are the outliers in that same dataset...',
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 202
          })
        })

      renderChatPage()

      // First query
      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Analyze ETH daytime vs nighttime patterns")
      
      let sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/ETH shows significant patterns/)).toBeInTheDocument()
      })

      // Second query - should maintain context
      await user.type(chatInput, "Now show me the outliers")
      sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Based on your previous ETH analysis/)).toBeInTheDocument()
      })

      // Verify context was passed
      expect(fetch).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/chat/send', expect.objectContaining({
        body: expect.stringContaining('"conversation_id":1')
      }))
    })
  })

  describe('Real-time Data Integration', () => {
    it('should integrate real-time market data in AI responses', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: `Based on real-time ETH data (current price: $2,645.32):

**Live Market Analysis:**
- Current volatility: 24.7% (above 30-day average)
- Daytime session volume: 45,623 ETH (15% above average)
- Real-time leverage ratio: 2.3x (within normal range)

**Pattern Confirmation:**
- Today's pattern matches historical nighttime outperformance
- Current session suggests 8% higher probability of continued uptrend`,
          timestamp: new Date().toISOString(),
          conversation_id: 1,
          message_id: 301,
          metadata: {
            real_time_data: true,
            eth_price: 2645.32,
            volatility: 24.7,
            data_source: 'hyperliquid'
          }
        })
      })

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Show me current ETH patterns with real-time data")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Based on real-time ETH data/)).toBeInTheDocument()
        expect(screen.getByText(/current price: \$2,645\.32/)).toBeInTheDocument()
        expect(screen.getByText(/Current volatility: 24\.7%/)).toBeInTheDocument()
      })
    })

    it('should handle data source selection and integration', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: `I recommend using **Hyperliquid** for your analysis:

**Data Source Comparison:**
- Hyperliquid: ✅ Best timestamp precision, ✅ Complete order book
- Binance: ✅ Highest volume, ⚠️ Lower resolution
- Static Library: ✅ Clean data, ⚠️ Not real-time

**Recommendation:** Hyperliquid for real-time precision + Binance for historical context`,
          timestamp: new Date().toISOString(),
          conversation_id: 1,
          message_id: 401,
          suggestions: [
            'Set up Hyperliquid API connection',
            'Configure data pipeline for continuous analysis'
          ]
        })
      })

      renderChatPage()

      const suggestionButton = await screen.findByTestId('suggestion-1')
      await user.click(suggestionButton)

      await waitFor(() => {
        expect(screen.getByText(/I recommend using \*\*Hyperliquid\*\*/)).toBeInTheDocument()
        expect(screen.getByText(/Best timestamp precision/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock API error
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Analyze market data")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Error: Network error/)).toBeInTheDocument()
      })
    })

    it('should recover from temporary service issues', async () => {
      const user = userEvent.setup()
      
      // First call fails, second succeeds
      ;(fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'Service restored. Here is your ETH analysis...',
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 501
          })
        })

      renderChatPage()

      // First attempt - should fail
      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Analyze ETH data")
      
      let sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Service temporarily unavailable/)).toBeInTheDocument()
      })

      // Retry - should succeed
      await user.type(chatInput, "Retry ETH analysis")
      sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Service restored/)).toBeInTheDocument()
      })
    })

    it('should validate complex queries before submission', async () => {
      const user = userEvent.setup()
      renderChatPage()

      // Empty query should not be submitted
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      expect(fetch).not.toHaveBeenCalled()

      // Very long query should be handled appropriately
      const chatInput = screen.getByTestId('chat-input')
      const longQuery = "Analyze ".repeat(1000) + "ETH patterns"
      await user.type(chatInput, longQuery)
      await user.click(sendButton)

      // Should still process but with appropriate handling
      expect(fetch).toHaveBeenCalled()
    })
  })

  describe('Suggestion System Integration', () => {
    it('should generate and display contextual suggestions', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'ETH analysis complete. Here are the key patterns...',
          timestamp: new Date().toISOString(),
          conversation_id: 1,
          message_id: 601,
          suggestions: [
            'Generate backtesting results for these patterns',
            'Set up real-time alerts for outlier detection',
            'Compare with BTC patterns for correlation analysis'
          ]
        })
      })

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Complete ETH pattern analysis")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/ETH analysis complete/)).toBeInTheDocument()
        expect(screen.getByTestId('suggestions-panel')).toBeInTheDocument()
      })
    })

    it('should handle suggestion clicks and generate follow-up queries', async () => {
      const user = userEvent.setup()
      
      // Mock responses for suggestion workflow
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'Initial analysis complete...',
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 701
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: `**Backtesting Results for Nighttime Strategy:**

**Performance Metrics:**
- Total Return: 34.7% (vs 18.2% buy-and-hold)
- Sharpe Ratio: 1.89 (vs 0.67 buy-and-hold)
- Maximum Drawdown: -8.3% (vs -28.7% buy-and-hold)
- Win Rate: 67.4%

**Strategy Summary:**
- Entry: ETH positions during nighttime sessions (10 PM - 6 AM EST)
- Exit: Close positions at market open
- Risk management: 2% position sizing with 5% stop-loss`,
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: 702
          })
        })

      renderChatPage()

      // Initial query
      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Analyze ETH patterns")
      
      let sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Initial analysis complete/)).toBeInTheDocument()
      })

      // Click backtesting suggestion
      const backtestingSuggestion = screen.getByTestId('suggestion-2')
      await user.click(backtestingSuggestion)

      await waitFor(() => {
        expect(screen.getByText(/Backtesting Results for Nighttime Strategy/)).toBeInTheDocument()
        expect(screen.getByText(/Total Return: 34\.7%/)).toBeInTheDocument()
        expect(screen.getByText(/Sharpe Ratio: 1\.89/)).toBeInTheDocument()
      })

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Analysis Results Display', () => {
    it('should display comprehensive analysis results', async () => {
      renderChatPage()

      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument()
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
        expect(screen.getByTestId('statistical-summary')).toBeInTheDocument()
      })

      expect(screen.getByText('ETH Performance Analysis')).toBeInTheDocument()
      expect(screen.getByText('Statistical Summary')).toBeInTheDocument()
    })

    it('should update analysis results based on query responses', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Updated analysis shows new patterns in ETH data...',
          timestamp: new Date().toISOString(),
          conversation_id: 1,
          message_id: 801,
          metadata: {
            chart_data: {
              performance: [1.0, 1.12, 1.08, 1.15, 1.22],
              volatility: [0.24, 0.28, 0.22, 0.31, 0.26]
            }
          }
        })
      })

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Update ETH analysis with latest data")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Updated analysis shows new patterns/)).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle multiple concurrent queries efficiently', async () => {
      const user = userEvent.setup()
      
      // Mock rapid query responses
      ;(fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            response: 'Query processed successfully',
            timestamp: new Date().toISOString(),
            conversation_id: 1,
            message_id: Math.floor(Math.random() * 1000)
          })
        })

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      
      // Rapid query submission
      const queries = [
        "Quick ETH check",
        "Current volatility",
        "Market status"
      ]

      for (const query of queries) {
        await user.clear(chatInput)
        await user.type(chatInput, query)
        const sendButton = screen.getByTestId('send-button')
        await user.click(sendButton)
      }

      // All queries should be processed
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(3)
      }, { timeout: 5000 })
    })

    it('should maintain responsive UI during heavy analysis', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      ;(fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              response: 'Complex analysis completed',
              timestamp: new Date().toISOString(),
              conversation_id: 1,
              message_id: 901
            })
          }), 2000)
        )
      )

      renderChatPage()

      const chatInput = screen.getByTestId('chat-input')
      await user.type(chatInput, "Run complex ETH analysis")
      
      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // UI should remain responsive during processing
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
      expect(screen.getAllByText('Processing...').length).toBeGreaterThan(0)

      // Eventually completes
      await waitFor(() => {
        expect(screen.getByText(/Complex analysis completed/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})