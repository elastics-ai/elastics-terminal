'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, User, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDemoChat } from '@/contexts/DemoChatContext'

export function DemoChat() {
  const {
    messages,
    addMessage,
    isExpanded,
    setIsExpanded,
    inputValue,
    setInputValue
  } = useDemoChat()
  
  const [isTyping, setIsTyping] = useState(false)
  const [chatResponses, setChatResponses] = useState<any>(null)
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat responses from JSON
  useEffect(() => {
    fetch('/demo-chat-responses.json')
      .then(res => res.json())
      .then(data => setChatResponses(data))
      .catch(err => console.error('Failed to load chat responses:', err))
  }, [])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isExpanded])

  const suggestions = chatResponses?.suggestions || [
    "What's my portfolio performance?",
    "Show me top opportunities across prediction markets",
    "Is there any arbitrage across venues?",
    "Help me create a trading strategy"
  ]

  // Get response based on user input
  const getDemoResponse = (userInput: string) => {
    if (!chatResponses) {
      return {
        content: "Loading responses...",
        modules: ['System']
      }
    }

    const input = userInput.toLowerCase()
    
    // Find matching response
    for (const responseConfig of chatResponses.responses) {
      const matches = responseConfig.patterns.every((pattern: string) => 
        input.includes(pattern.toLowerCase())
      )
      if (matches) {
        return responseConfig.response
      }
    }
    
    // Return default response
    return chatResponses.defaultResponse
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    
    // Add user message
    const userMessage = { role: 'user' as const, content: inputValue }
    addMessage(userMessage)
    setInputValue('')
    setIsTyping(true)
    
    // Simulate typing delay
    setTimeout(() => {
      const response = getDemoResponse(inputValue)
      const assistantMessage = { role: 'assistant' as const, ...response }
      addMessage(assistantMessage)
      setIsTyping(false)
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    setIsExpanded(true)
  }

  const handleActionClick = (action: any) => {
    if (action.params) {
      // Store params in sessionStorage for the target page to use
      sessionStorage.setItem('agentBuilderParams', JSON.stringify(action.params))
    }
    router.push(action.url)
  }

  return (
    <>
      {/* Collapsed State - Bottom Bar */}
      {!isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 h-20">
          <div className="h-full flex flex-col justify-center px-6">
            {/* Suggestions */}
            <div className="mb-2 flex gap-2 flex-wrap justify-center">
              {suggestions.map((suggestion: string) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors border border-gray-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            
            {/* Input */}
            <div className="relative">
              <Input
                placeholder="Ask AI Assistant about prediction markets..."
                className="w-full h-12 pl-4 pr-12 text-base bg-gray-50 border-gray-200 rounded-lg"
                onFocus={() => setIsExpanded(true)}
                readOnly
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 h-8 w-8"
                onClick={() => setIsExpanded(true)}
              >
                <Send className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded State - Chat Panel */}
      {isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 h-[600px] shadow-2xl">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">AI Assistant - Prediction Markets</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 messages-container">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Welcome to AI Assistant Demo</p>
                    <p className="text-sm">Ask me about prediction markets, portfolio performance, or arbitrage opportunities!</p>
                  </div>
                )}
                {messages.map((message, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' ? 'bg-gray-500' : 'bg-blue-500'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' ? 'bg-gray-100' : 'bg-white border border-gray-200'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                      {message.modules && (
                        <div className="text-xs text-gray-500 mt-2">
                          <div className="font-medium mb-1">📦 Modules used:</div>
                          <div className="pl-3 space-y-0.5">
                            {message.modules.map((module, i) => (
                              <div key={i}>• {module.includes(':') ? module : `${getModuleType(module)}: ${module}`}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.action && (
                        <div className="mt-3">
                          <Button
                            onClick={() => handleActionClick(message.action)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {message.action.label} →
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-center gap-1 pt-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }} className="flex gap-2">
                  <Input
                    placeholder="Ask about prediction markets..."
                    className="flex-1"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isTyping}
                  />
                  <Button type="submit" disabled={!inputValue.trim() || isTyping}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </form>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  AI Assistant powered by Elastics modular architecture
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getModuleType(module: string): string {
  if (module.includes('Feed') || module.includes('API')) return 'Data Source'
  if (module.includes('Scanner') || module.includes('Map')) return 'Analysis'
  if (module.includes('Ranker')) return 'Ranking Logic'
  if (module.includes('Calculator')) return 'Risk Engine'
  if (module.includes('Hedger')) return 'Execution'
  if (module.includes('Builder') || module.includes('Template')) return 'Construction'
  if (module.includes('Engine')) return 'Processing'
  return 'Module'
}