'use client'

import { useState } from 'react'
import { AppLayout } from "@/components/layout/app-layout"
import { ChatInterface } from "@/components/bloomberg/views/chat/chat-interface"

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }>>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to the AI Portfolio Assistant. I can help you analyze your portfolio, understand market conditions, and answer questions about volatility and options trading.',
      timestamp: new Date()
    }
  ])

  const handleSendMessage = (content: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-4">
          <h1 className="text-xl font-normal">Chat</h1>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <ChatInterface 
            messages={messages}
            onSendMessage={handleSendMessage}
            setMessages={setMessages}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      </div>
    </AppLayout>
  )
}
