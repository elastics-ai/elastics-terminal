'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Minimize2, Maximize2, Bot, Save, GitBranch, ExternalLink, MoreVertical, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import { useFloatingChat } from '@/contexts/FloatingChatContext'
import { useRouter } from 'next/navigation'
import { BranchCreationModal } from './BranchCreationModal'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  messageId?: number // Backend message ID for branching
}

export const FloatingChatInput: React.FC = () => {
  const { isOpen, setIsOpen, initialMessage, clearInitialMessage, conversationInfo, setConversationInfo } = useFloatingChat()
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hi! I\'m your AI assistant. Ask me anything about your portfolio, market analysis, or trading strategies.',
      timestamp: new Date()
    }
  ])
  const [sessionId] = useState(() => `floating_${Date.now()}`)
  const [showMenu, setShowMenu] = useState(false)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [branchFromMessage, setBranchFromMessage] = useState<Message | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu) {
        const target = e.target as HTMLElement
        if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
          setShowMenu(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // Handle initial message from context
  useEffect(() => {
    if (initialMessage && isOpen) {
      setInput(initialMessage)
      clearInitialMessage()
      // Auto-send the initial message
      setTimeout(() => {
        if (inputRef.current) {
          handleSubmit({ preventDefault: () => {} } as React.FormEvent)
        }
      }, 100)
    }
  }, [initialMessage, isOpen])

  // Load conversation if conversationInfo changes
  useEffect(() => {
    const loadConversation = async () => {
      if (conversationInfo?.id && conversationInfo.isSaved) {
        try {
          const response = await chatAPI.getConversationMessages(conversationInfo.id)
          if (response.messages && response.messages.length > 0) {
            const loadedMessages: Message[] = response.messages.map((msg: any) => ({
              id: msg.id.toString(),
              messageId: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at)
            }))
            
            // Add system message at the beginning
            setMessages([
              {
                id: '1',
                role: 'system',
                content: 'Hi! I\'m your AI assistant. This is a saved conversation.',
                timestamp: new Date()
              },
              ...loadedMessages
            ])
          }
        } catch (error) {
          console.error('Failed to load conversation:', error)
        }
      }
    }

    loadConversation()
  }, [conversationInfo?.id])

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatAPI.sendMessage({
      content,
      session_id: sessionId,
      conversation_id: conversationInfo?.id,
      parent_message_id: messages[messages.length - 1]?.messageId,
    }),
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp),
        messageId: data.message_id,
      }
      setMessages(prev => [...prev, assistantMessage])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sendMessageMutation.isPending) return

    // If this is the first real message and we haven't saved yet, save the conversation
    if (!conversationInfo?.isSaved && messages.filter(m => m.role === 'user').length === 0) {
      try {
        await saveConversationMutation.mutateAsync()
      } catch (error) {
        console.error('Failed to auto-save conversation:', error)
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      messageId: Date.now() // Temporary ID until we get the real one from backend
    }
    
    setMessages(prev => [...prev, userMessage])
    sendMessageMutation.mutate(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // Save current chat as a conversation
  const saveConversationMutation = useMutation({
    mutationFn: async () => {
      const title = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Conversation'
      const response = await chatAPI.createConversation({
        session_id: sessionId,
        title: title + '...',
        use_case: 'general_chat'
      })
      
      // Also save all current messages to the conversation
      for (const msg of messages) {
        if (msg.role !== 'system') {
          await chatAPI.sendMessage({
            content: msg.content,
            session_id: sessionId,
            conversation_id: response.conversation_id
          })
        }
      }
      
      return response
    },
    onSuccess: (data) => {
      const title = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Conversation'
      setConversationInfo({
        id: data.conversation_id,
        title: title + '...',
        isSaved: true
      })
    }
  })

  // Create a branch from a message
  const createBranchMutation = useMutation({
    mutationFn: ({ messageId, title }: { messageId: number; title: string }) => {
      if (!conversationInfo?.id) throw new Error('No conversation to branch from')
      return chatAPI.createConversationBranch(conversationInfo.id, {
        parent_message_id: messageId,
        title
      })
    },
    onSuccess: (data) => {
      // Navigate to the new branch
      router.push(`/chat/${data.conversation_id}`)
      setIsOpen(false)
    }
  })

  const handleSaveConversation = () => {
    if (!conversationInfo?.isSaved) {
      saveConversationMutation.mutate()
    }
  }

  const handleViewFullChat = () => {
    if (conversationInfo?.id) {
      router.push(`/chat/${conversationInfo.id}`)
      setIsOpen(false)
    }
  }

  const handleViewHistory = () => {
    router.push('/chat-history')
    setIsOpen(false)
  }

  const handleCreateBranch = (message: Message) => {
    if (message.messageId && conversationInfo?.id) {
      setBranchFromMessage(message)
      setShowBranchModal(true)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 
                     text-white rounded-full shadow-lg flex items-center justify-center z-50
                     transition-colors"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed z-50 bg-gray-900 rounded-lg shadow-2xl border border-gray-800",
              isMinimized 
                ? "bottom-6 right-6 w-80"
                : "bottom-6 right-6 w-96 h-[600px] max-h-[80vh]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {conversationInfo?.title || 'AI Assistant'}
                    </h3>
                    {conversationInfo?.isSaved && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        Saved
                      </span>
                    )}
                    {conversationInfo?.parentId && (
                      <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        Branch
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {conversationInfo?.isSaved ? 'Conversation saved' : 'Ephemeral chat'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="menu-button p-1.5 hover:bg-gray-800 rounded transition-colors"
                    title="Menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="menu-dropdown absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-10"
                      >
                        {!conversationInfo?.isSaved && (
                          <button
                            onClick={() => {
                              handleSaveConversation()
                              setShowMenu(false)
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                            disabled={saveConversationMutation.isPending}
                          >
                            <Save className="w-4 h-4" />
                            Save Conversation
                          </button>
                        )}
                        
                        {conversationInfo?.id && (
                          <button
                            onClick={() => {
                              handleViewFullChat()
                              setShowMenu(false)
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Full Chat
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            handleViewHistory()
                            setShowMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                        >
                          <History className="w-4 h-4" />
                          Chat History
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-140px)]">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex group",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className="relative">
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            message.role === 'user'
                              ? "bg-purple-600 text-white"
                              : message.role === 'assistant'
                              ? "bg-gray-800 text-gray-100"
                              : "bg-blue-900/20 text-blue-300 italic"
                          )}
                        >
                          {message.role === 'assistant' ? (
                            <ReactMarkdown
                              className="prose prose-sm prose-invert max-w-none"
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                code: ({ className, children, ...props }) => {
                                  const isInline = !className
                                  return isInline ? (
                                    <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <pre className="bg-gray-800 p-2 rounded overflow-x-auto my-2">
                                      <code className="text-sm" {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  )
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                            {conversationInfo?.isSaved && message.messageId && index > 0 && (
                              <button
                                onClick={() => handleCreateBranch(message)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                                title="Create branch from here"
                              >
                                <GitBranch className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse delay-75" />
                          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length === 1 && !conversationInfo?.isSaved && (
                  <div className="px-4 pt-2">
                    <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "What's my portfolio performance?",
                        "Show risk metrics",
                        "Market analysis",
                        "Recent trades"
                      ].map((action) => (
                        <button
                          key={action}
                          onClick={() => {
                            setInput(action)
                            handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                          }}
                          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 
                                   rounded-md transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saved Conversation Notice */}
                {conversationInfo?.isSaved && messages.length === 1 && (
                  <div className="px-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Save className="w-3 h-3" />
                      <span>This conversation is saved and can be accessed from chat history</span>
                    </div>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
                  <div className="flex gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                               placeholder-gray-500 resize-none"
                      rows={1}
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || sendMessageMutation.isPending}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                               transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch Creation Modal */}
      {showBranchModal && branchFromMessage && (
        <BranchCreationModal
          isOpen={showBranchModal}
          onClose={() => {
            setShowBranchModal(false)
            setBranchFromMessage(null)
          }}
          onConfirm={(title) => {
            if (branchFromMessage.messageId) {
              createBranchMutation.mutate({
                messageId: branchFromMessage.messageId,
                title
              })
            }
            setShowBranchModal(false)
            setBranchFromMessage(null)
          }}
          parentMessage={{
            id: branchFromMessage.messageId || 0,
            content: branchFromMessage.content,
            role: branchFromMessage.role as 'user' | 'assistant',
            timestamp: branchFromMessage.timestamp
          }}
          currentConversationTitle={conversationInfo?.title || 'Current Conversation'}
        />
      )}
    </>
  )
}