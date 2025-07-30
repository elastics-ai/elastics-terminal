import { NextRequest, NextResponse } from 'next/server'

/**
 * Strategy Builder Chat API Endpoint
 * Handles natural language commands for creating and editing trading strategies
 */

interface ChatRequest {
  message: string
  session_id: string
  flow_id?: string
}

interface FlowNode {
  id: string
  type: string
  data: Record<string, unknown>
  position: { x: number; y: number }
}

interface FlowConnection {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

interface StrategyTranslation {
  sql?: string
  python?: string
  description?: string
}

interface WebSocketEvent {
  type: string
  data: Record<string, unknown>
}

interface ChatResponse {
  response: string
  action: string
  flow_id?: string
  node_id?: string
  strategy_name?: string
  nodes?: FlowNode[]
  connections?: FlowConnection[]
  translation?: StrategyTranslation
  websocket_event?: WebSocketEvent
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, session_id, flow_id } = body
    
    // Validate required fields
    if (!message || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message and session_id' },
        { status: 400 }
      )
    }
    
    // Call Python backend strategy builder chat handler
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const response = await fetch(`${backendUrl}/api/strategy-builder/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id,
        flow_id
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      
      return NextResponse.json(
        { 
          error: `Backend service error: ${response.status}`,
          response: 'Sorry, the strategy builder service is currently unavailable. Please try again later.',
          action: 'error'
        },
        { status: 500 }
      )
    }
    
    const result: ChatResponse = await response.json()
    
    // Log successful interaction
    console.log(`Strategy chat processed: ${message.substring(0, 50)}... -> ${result.action}`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Strategy builder chat error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        response: 'Sorry, I encountered an error processing your request. Please try again.',
        action: 'error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  try {
    if (action === 'commands') {
      // Return available commands and help
      return NextResponse.json({
        commands: [
          {
            command: '/add-node <type> <description>',
            description: 'Add a new node to the strategy flow',
            examples: [
              '/add-node data BTC price feed from Deribit',
              '/add-node function Calculate RSI with 14-period lookback',
              '/add-node strategy Buy when RSI > 70, sell when < 30'
            ]
          },
          {
            command: '/create-strategy "name" <description>',
            description: 'Create a complete strategy from description',
            examples: [
              '/create-strategy "Momentum Trading" Monitor BTC, calculate RSI, trade on signals',
              '/create-strategy "Volatility Arbitrage" Track IV surface, find mispricings, execute trades'
            ]
          },
          {
            command: '/edit-node <node-id> <property> <description>',
            description: 'Edit properties of an existing node',
            examples: [
              '/edit-node node_123 period Change RSI period to 21 days',
              '/edit-node rsi_calc threshold Update buy threshold to 75'
            ]
          },
          {
            command: '/connect <node1> to <node2>',
            description: 'Connect two nodes in the data flow',
            examples: [
              '/connect data_source to rsi_calculator',
              '/connect strategy_signal to order_execution'
            ]
          },
          {
            command: '/preview-code <node-id>',
            description: 'Show generated Python/SQL code for a node',
            examples: [
              '/preview-code node_123',
              '/preview-code rsi_calculator'
            ]
          },
          {
            command: '/test-strategy <strategy-id>',
            description: 'Run backtesting simulation on strategy',
            examples: [
              '/test-strategy momentum_v1',
              '/test-strategy my_strategy'
            ]
          }
        ],
        nodeTypes: [
          { type: 'data', description: 'Data sources (market data, APIs, feeds)' },
          { type: 'function', description: 'Calculations and indicators (RSI, MACD, etc.)' },
          { type: 'strategy', description: 'Trading logic and signal generation' },
          { type: 'risk', description: 'Risk management and position sizing' },
          { type: 'execution', description: 'Order placement and trade execution' }
        ],
        naturalLanguage: {
          description: 'You can also describe strategies in plain English',
          examples: [
            'Create a momentum strategy that buys BTC when RSI crosses above 70',
            'Build a volatility surface arbitrage system for options trading',
            'Make a pairs trading strategy for BTC and ETH with mean reversion signals'
          ]
        }
      })
    }
    
    if (action === 'health') {
      // Health check endpoint
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Strategy builder API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}