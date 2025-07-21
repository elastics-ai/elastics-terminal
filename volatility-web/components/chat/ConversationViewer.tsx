'use client'

import React, { useState } from 'react'
import { GitBranch, ExternalLink, Download, X } from 'lucide-react'
import { ChatMessage } from '../bloomberg/views/chat/chat-message'
import { cn } from '@/lib/utils'

interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  metadata?: any
  sql_query?: string
  query_results?: string
}

interface ConversationViewerProps {
  conversationId?: number
  messages: Message[]
  title: string
  useCase: string
  onBranchFrom?: (messageId: number) => void
}

export const ConversationViewer: React.FC<ConversationViewerProps> = ({
  conversationId,
  messages,
  title,
  useCase,
  onBranchFrom
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null)

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a conversation to view</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    const content = messages.map(msg => 
      `[${msg.role.toUpperCase()}] ${new Date(msg.created_at).toLocaleString()}\n${msg.content}\n`
    ).join('\n---\n\n')
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversationId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenInChat = () => {
    window.open(`/chat/${conversationId}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium">{title}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="px-2 py-0.5 bg-gray-800 rounded">
                {useCase.replace(/_/g, ' ')}
              </span>
              <span>{messages.length} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInChat}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Open in chat"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Export conversation"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "relative group",
              selectedMessageId === message.id && "bg-gray-900/50 rounded-lg p-2"
            )}
          >
            <ChatMessage
              message={{
                id: message.id.toString(),
                messageId: message.id,
                role: message.role,
                content: message.content,
                timestamp: new Date(message.created_at)
              }}
              onBranch={onBranchFrom}
            />
            
            {/* SQL Query Display */}
            {message.sql_query && (
              <div className="mt-2 ml-4">
                <details className="group/sql">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                    View SQL Query
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 rounded text-xs overflow-x-auto">
                    <code>{message.sql_query}</code>
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}