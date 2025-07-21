'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { History, GitBranch, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  messageId?: number
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  onSuggestionClick?: (suggestion: string) => void
  conversationId?: number
  onConversationCreated?: (id: number) => void
  parentMessageId?: number
  conversationTitle?: string
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  setMessages, 
  onSuggestionClick,
  conversationId,
  onConversationCreated,
  parentMessageId,
  conversationTitle
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [messageBranches, setMessageBranches] = useState<Record<number, number>>({})
  const [showBranchDialog, setShowBranchDialog] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatAPI.sendMessage({
      content,
      session_id: sessionId,
      conversation_id: currentConversationId,
    }),
    onSuccess: (data) => {
      // Update conversation ID if new conversation was created
      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id)
        onConversationCreated?.(data.conversation_id)
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp),
        messageId: data.message_id
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Update suggestions if provided
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sendMessageMutation.isPending) return

    const content = input.trim()
    setInput('')
    onSendMessage(content)
    sendMessageMutation.mutate(content)
  }

  const handleClear = () => {
    setMessages([{
      id: '1',
      role: 'system',
      content: 'Chat history cleared. How can I help you analyze your portfolio?',
      timestamp: new Date()
    }])
    setCurrentConversationId(undefined)
    setSuggestions([])
  }

  const handleViewHistory = () => {
    router.push('/chat-history')
  }

  const handleBranch = async (messageId: number) => {
    if (!currentConversationId) return
    
    try {
      const response = await fetch(`/api/chat/conversations/${currentConversationId}/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_message_id: messageId,
          title: 'Branch from message'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Navigate to the new branched conversation
        router.push(`/chat/${data.conversation_id}`)
      }
    } catch (error) {
      console.error('Error creating branch:', error)
    }
  }

  // Fetch branch counts for messages
  useEffect(() => {
    const fetchBranchCounts = async () => {
      if (!messages.length) return
      
      const branchCounts: Record<number, number> = {}
      
      for (const msg of messages) {
        if (msg.messageId) {
          try {
            const response = await fetch(`/api/chat/messages/${msg.messageId}/branches`)
            const data = await response.json()
            if (data.branches && data.branches.length > 0) {
              branchCounts[msg.messageId] = data.branches.length
            }
          } catch (error) {
            console.error('Error fetching branches:', error)
          }
        }
      }
      
      setMessageBranches(branchCounts)
    }
    
    fetchBranchCounts()
  }, [messages])

  // Use provided suggestions or defaults
  const displaySuggestions = suggestions.length > 0 ? suggestions : [
    "What's my current portfolio performance?",
    "Show me my positions with highest volatility",
    "Analyze my risk exposure",
    "What are my top performing trades today?"
  ]

  return (
    <div className="flex flex-col h-[700px]">
      {/* Branch indicator */}
      {parentMessageId && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300">
              This is a branched conversation
              {conversationTitle && ` - "${conversationTitle}"`}
            </span>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message}
            onBranch={handleBranch}
            branches={message.messageId ? messageBranches[message.messageId] : undefined}
          />
        ))}
        {sendMessageMutation.isPending && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
            <span>AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && onSuggestionClick && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {displaySuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-sm border border-gray-700 rounded hover:bg-gray-800 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={sendMessageMutation.isPending}
        />
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Powered by Claude 3.5 • Context-aware analysis</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleViewHistory}
              className="flex items-center gap-1 hover:text-gray-300 transition-colors"
            >
              <History className="w-3 h-3" />
              View History
            </button>
            <button
              onClick={handleClear}
              className="hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
