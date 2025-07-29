'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare,
  Code,
  Play,
  Plus,
  GitBranch,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Terminal
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useStrategyBuilderWebSocket } from '@/hooks/useStrategyBuilderWebSocket'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  action?: string
  metadata?: {
    command?: string
    flowId?: string
    nodeId?: string
    executionTime?: number
    status?: 'success' | 'error' | 'pending'
  }
}

interface StrategyBuilderChatInterfaceProps {
  sessionId: string
  flowId?: string
  onFlowUpdate?: (data: any) => void
  onNodeHighlight?: (nodeId: string) => void
  className?: string
}

interface CommandSuggestion {
  command: string
  description: string
  example: string
  category: 'node' | 'strategy' | 'flow' | 'code'
}

const commandSuggestions: CommandSuggestion[] = [
  {
    command: '/add-node',
    description: 'Add a new node to the strategy',
    example: '/add-node function Calculate RSI with 14-period lookback',
    category: 'node'
  },
  {
    command: '/create-strategy',
    description: 'Create a complete strategy from description',
    example: '/create-strategy "Momentum Trading" Buy when RSI > 70, sell when < 30',
    category: 'strategy'
  },
  {
    command: '/edit-node',
    description: 'Edit properties of existing node',
    example: '/edit-node node_123 period Change RSI period to 21',
    category: 'node'
  },
  {
    command: '/connect',
    description: 'Connect two nodes in the flow',
    example: '/connect data_source to rsi_calculator',
    category: 'flow'
  },
  {
    command: '/preview-code',
    description: 'Show generated code for a node',
    example: '/preview-code node_123',
    category: 'code'
  },
  {
    command: '/test-strategy',
    description: 'Run strategy simulation',
    example: '/test-strategy strategy_abc',
    category: 'code'
  }
]

const quickActions = [
  { label: 'Add Data Source', command: '/add-node data ', icon: Plus },
  { label: 'Add Calculation', command: '/add-node function ', icon: Zap },
  { label: 'Add Strategy Logic', command: '/add-node strategy ', icon: GitBranch },
  { label: 'Help', command: '/help', icon: MessageSquare }
]

export function StrategyBuilderChatInterface({
  sessionId,
  flowId,
  onFlowUpdate,
  onNodeHighlight,
  className = ''
}: StrategyBuilderChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: '🤖 Welcome to Strategy Builder Chat! I can help you create trading strategies using natural language or commands. Type `/help` for available commands or just describe what you want to build.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // WebSocket connection for real-time updates
  const { isConnected, sendMessage } = useStrategyBuilderWebSocket({
    sessionId,
    onStrategyEvent: handleStrategyEvent,
    onConnectionChange: (connected) => {
      if (!connected) {
        toast({
          title: "Connection Lost",
          description: "Reconnecting to strategy builder service...",
          variant: "destructive"
        })
      }
    }
  })
  
  // Handle strategy builder events from WebSocket
  function handleStrategyEvent(event: any) {
    // Add system message for significant events
    if (['strategy_created', 'node_added', 'nodes_connected'].includes(event.type)) {
      const systemMessage: ChatMessage = {
        id: `event_${Date.now()}`,
        role: 'system',
        content: getEventMessage(event),
        timestamp: new Date(),
        metadata: {
          status: 'success',
          flowId: event.data.flow_id,
          nodeId: event.data.node_id || event.data.node?.id
        }
      }
      
      setMessages(prev => [...prev, systemMessage])
      
      // Notify parent of flow updates
      onFlowUpdate?.(event.data)
      
      // Highlight relevant nodes
      if (event.data.node_id || event.data.node?.id) {
        onNodeHighlight?.(event.data.node_id || event.data.node.id)
      }
    }
  }
  
  // Generate event messages
  function getEventMessage(event: any): string {
    switch (event.type) {
      case 'strategy_created':
        return `✅ Created strategy "${event.data.strategy_name}" with ${event.data.node_count} nodes`
      case 'node_added':
        return `➕ Added ${event.data.node.type} node: ${event.data.node.description}`
      case 'node_updated':
        return `🔄 Updated node ${event.data.node_id} - ${event.data.updated_property}`
      case 'nodes_connected':
        return `🔗 Connected ${event.data.connection.from} → ${event.data.connection.to}`
      case 'code_generated':
        return `💻 Generated code for node ${event.data.node_id}`
      case 'strategy_tested':
        return `🧪 Strategy test completed - ${(event.data.success_rate * 100).toFixed(1)}% success rate`
      default:
        return `📝 Strategy updated`
    }
  }
  
  // Handle message submission
  const handleSubmit = useCallback(async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || isLoading) return
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowSuggestions(false)
    
    try {
      // Send to backend strategy builder chat handler
      const response = await fetch('/api/strategy-builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
          flow_id: flowId
        })
      })
      
      const result = await response.json()
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: result.response || 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
        action: result.action,
        metadata: {
          command: result.action,
          flowId: result.flow_id,
          nodeId: result.node_id,
          status: result.action === 'error' ? 'error' : 'success'
        }
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Handle specific actions
      if (result.websocket_event) {
        // WebSocket event will be handled by the hook
        onFlowUpdate?.(result)
      }
      
      // Show success/error toast
      if (result.action === 'error') {
        toast({
          title: "Command Failed",
          description: result.response,
          variant: "destructive"
        })
      } else if (['node_added', 'strategy_created', 'nodes_connected'].includes(result.action)) {
        // Success feedback is handled by WebSocket events
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date(),
        metadata: { status: 'error' }
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      toast({
        title: "Network Error",
        description: "Failed to send message. Please check your connection.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId, flowId, onFlowUpdate])
  
  // Handle input changes and command suggestions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    
    // Show command suggestions when typing /
    if (value.startsWith('/') && value.length > 1) {
      setShowSuggestions(true)
      setSelectedSuggestionIndex(-1)
    } else {
      setShowSuggestions(false)
    }
  }, [])
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      if (showSuggestions && selectedSuggestionIndex >= 0) {
        const suggestion = getFilteredSuggestions()[selectedSuggestionIndex]
        setInput(suggestion.example)
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      } else {
        handleSubmit()
      }
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault()
      const suggestions = getFilteredSuggestions()
      setSelectedSuggestionIndex(prev => 
        prev <= 0 ? suggestions.length - 1 : prev - 1
      )
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault()
      const suggestions = getFilteredSuggestions()
      setSelectedSuggestionIndex(prev => 
        prev >= suggestions.length - 1 ? 0 : prev + 1
      )
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }, [showSuggestions, selectedSuggestionIndex, handleSubmit])
  
  // Filter command suggestions based on input
  const getFilteredSuggestions = useCallback(() => {
    if (!input.startsWith('/')) return []
    
    const query = input.slice(1).toLowerCase()
    return commandSuggestions.filter(suggestion =>
      suggestion.command.slice(1).toLowerCase().includes(query) ||
      suggestion.description.toLowerCase().includes(query)
    )
  }, [input])
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  // Render message with proper styling
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    
    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
          ${isUser ? 'bg-primary text-primary-foreground' : 
            isSystem ? 'bg-muted text-muted-foreground' : 'bg-blue-500 text-white'}
        `}>
          {isUser ? <User className="w-4 h-4" /> : 
           isSystem ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        {/* Message content */}
        <div className={`flex-1 space-y-2 ${isUser ? 'text-right' : ''}`}>
          <div className={`
            inline-block max-w-[80%] p-3 rounded-lg text-sm
            ${isUser ? 'bg-primary text-primary-foreground ml-auto' :
              isSystem ? 'bg-muted text-muted-foreground' : 'bg-card border'}
          `}>
            {/* Command indicator */}
            {message.metadata?.command && (
              <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                <Terminal className="w-3 h-3" />
                <span>{message.metadata.command}</span>
                {message.metadata.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                {message.metadata.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                {message.metadata.status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
              </div>
            )}
            
            {/* Message text */}
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {/* Code preview */}
            {message.content.includes('```') && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  <Code className="w-3 h-3 mr-1" />
                  Code Generated
                </Badge>
              </div>
            )}
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-muted-foreground ${isUser ? 'text-right' : ''}`}>
            {message.timestamp.toLocaleTimeString()}
            {message.metadata?.executionTime && (
              <span className="ml-2">• {message.metadata.executionTime}ms</span>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-medium">Strategy Builder Chat</h3>
          <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        {flowId && (
          <Badge variant="outline" className="text-xs">
            Flow: {flowId.slice(0, 8)}...
          </Badge>
        )}
      </div>
      
      {/* Quick actions */}
      <div className="flex gap-2 p-3 border-b bg-muted/30">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setInput(action.command)
                inputRef.current?.focus()
              }}
            >
              <Icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          )
        })}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="bg-card border rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing your request...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Command suggestions */}
      {showSuggestions && (
        <div className="border-t bg-background">
          <div className="p-2 text-xs text-muted-foreground border-b">
            Command Suggestions:
          </div>
          <div className="max-h-48 overflow-y-auto">
            {getFilteredSuggestions().map((suggestion, index) => (
              <div
                key={suggestion.command}
                className={`
                  p-3 cursor-pointer border-b last:border-b-0 hover:bg-muted/50
                  ${index === selectedSuggestionIndex ? 'bg-muted' : ''}
                `}
                onClick={() => {
                  setInput(suggestion.example)
                  setShowSuggestions(false)
                  inputRef.current?.focus()
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{suggestion.command}</div>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.category}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {suggestion.description}
                </div>
                <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1 mt-2">
                  {suggestion.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a command like /add-node or describe your strategy..."
            disabled={isLoading || !isConnected}
            className="flex-1"
          />
          <Button 
            onClick={() => handleSubmit()}
            disabled={isLoading || !input.trim() || !isConnected}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!isConnected && (
          <div className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Disconnected from strategy builder service
          </div>
        )}
      </div>
    </div>
  )
}