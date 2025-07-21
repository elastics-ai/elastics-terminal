'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ChatInterface } from '@/components/bloomberg/views/chat/chat-interface'
import { useQuery } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'
import { Loader2, ArrowLeft } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  messageId?: number
}

export default function ChatConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id ? parseInt(params.id as string) : null
  const [messages, setMessages] = useState<Message[]>([])

  // Load conversation and messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => conversationId ? chatAPI.getConversationMessages(conversationId) : null,
    enabled: !!conversationId,
  })

  // Convert messages to the format expected by ChatInterface
  useEffect(() => {
    if (messagesData?.messages) {
      const formattedMessages: Message[] = messagesData.messages.map((msg: any) => ({
        id: msg.id.toString(),
        messageId: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at)
      }))
      setMessages(formattedMessages)
    }
  }, [messagesData])

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-normal">Chat - Conversation #{conversationId}</h1>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 p-4">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            setMessages={setMessages}
            onSuggestionClick={handleSuggestionClick}
            conversationId={conversationId || undefined}
          />
        </div>
      </div>
    </AppLayout>
  )
}