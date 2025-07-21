'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Maximize2, Minimize2, GitBranch, History, Save, ChevronDown, Search, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import { useFloatingChat } from '@/contexts/FloatingChatContext'
import { useRouter } from 'next/navigation'
import { BranchCreationModal } from './BranchCreationModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  messageId?: number
}

export const FixedChatInput: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hi! I\'m your AI assistant. Ask me anything about your portfolio, market analysis, or trading strategies.',
      timestamp: new Date()
    }
  ])
  const [sessionId] = useState(() => `fixed_${Date.now()}`)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [branchFromMessage, setBranchFromMessage] = useState<Message | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const expandedInputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  
  const { conversationInfo, setConversationInfo } = useFloatingChat()

  // Fetch recent conversations for history
  const { data: conversationsData } = useQuery({
    queryKey: ['recent-conversations', historySearch],
    queryFn: () => chatAPI.getConversations({ 
      search: historySearch || undefined,
      limit: 10 
    }),
    enabled: showHistory
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isExpanded && expandedInputRef.current) {
      expandedInputRef.current.focus()
    }
  }, [isExpanded])

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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || sendMessageMutation.isPending) return

    // Auto-expand on first message
    if (!isExpanded && messages.filter(m => m.role === 'user').length === 0) {
      setIsExpanded(true)
    }

    // Auto-save conversation on first user message
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
      messageId: Date.now()
    }
    
    setMessages(prev => [...prev, userMessage])
    sendMessageMutation.mutate(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const saveConversationMutation = useMutation({
    mutationFn: async () => {
      const title = messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Conversation'
      const response = await chatAPI.createConversation({
        session_id: sessionId,
        title: title + '...',
        use_case: 'general_chat'
      })
      
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

  const createBranchMutation = useMutation({
    mutationFn: ({ messageId, title }: { messageId: number; title: string }) => {
      if (!conversationInfo?.id) throw new Error('No conversation to branch from')
      return chatAPI.createConversationBranch(conversationInfo.id, {
        parent_message_id: messageId,
        title
      })
    },
    onSuccess: (data) => {
      router.push(`/chat/${data.conversation_id}`)
      setIsExpanded(false)
    }
  })

  const handleCreateBranch = (message: Message) => {
    if (message.messageId && conversationInfo?.id) {
      setBranchFromMessage(message)
      setShowBranchModal(true)
    }
  }

  const openConversation = (conversationId: number) => {
    router.push(`/chat/${conversationId}`)
    setShowHistory(false)
    setIsExpanded(false)
  }

  return (
    <>
      {/* Fixed bottom chat input */}
      <div className={cn(
        "fixed bottom-0 left-60 right-0 bg-background border-t z-40 transition-all duration-300",
        isExpanded ? "h-[70vh]" : "h-20"
      )}>
        {/* Collapsed state - Simple input */}
        {!isExpanded && (
          <div className="h-full flex flex-col justify-end">
            {/* Quick Actions */}
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-6 pb-2"
                >
                  <div className="max-w-4xl mx-auto flex gap-2 flex-wrap">
                    {[
                      "What's my portfolio performance?",
                      "Show current positions",
                      "Analyze market volatility",
                      "Risk metrics summary"
                    ].map((action) => (
                      <button
                        key={action}
                        onClick={() => {
                          setInput(action)
                          setIsExpanded(true)
                          setTimeout(() => handleSubmit(), 100)
                        }}
                        className="text-sm px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full
                                 transition-colors border border-border"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Input */}
            <div className="px-6 pb-4">
              <div className="max-w-4xl mx-auto relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setShowQuickActions(false)
                  }}
                  onFocus={() => setIsExpanded(true)}
                  placeholder="Ask anything"
                  className="w-full h-12 pl-4 pr-12 text-base bg-muted border-0 rounded-lg focus:ring-2 focus:ring-primary"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 hover:bg-transparent"
                  onClick={() => setIsExpanded(true)}
                >
                  <Send className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded state - Full chat interface */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">
                    {conversationInfo?.title || 'New Chat'}
                  </h3>
                  {conversationInfo?.isSaved && (
                    <Badge variant="secondary" className="text-xs">
                      Saved
                    </Badge>
                  )}
                  {conversationInfo?.parentId && (
                    <Badge variant="outline" className="text-xs">
                      <GitBranch className="w-3 h-3 mr-1" />
                      Branch
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowHistory(!showHistory)}
                    title="Chat history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  {!conversationInfo?.isSaved && messages.filter(m => m.role === 'user').length > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => saveConversationMutation.mutate()}
                      disabled={saveConversationMutation.isPending}
                      title="Save conversation"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setIsExpanded(false)
                      setShowQuickActions(true)
                    }}
                    title="Minimize"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Messages */}
                <div className={cn(
                  "flex-1 overflow-y-auto",
                  showHistory && "md:flex-[2]"
                )}>
                  <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 group",
                          message.role === 'user' && "flex-row-reverse"
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
                          message.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : message.role === 'assistant'
                            ? "bg-muted border border-border"
                            : "bg-blue-500/10"
                        )}>
                          {message.role === 'user' ? 'U' : message.role === 'assistant' ? <Bot className="w-5 h-5" /> : 'i'}
                        </div>

                        {/* Message content */}
                        <div className={cn(
                          "flex-1 space-y-2",
                          message.role === 'user' && "flex flex-col items-end"
                        )}>
                          <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none",
                            message.role === 'user' && "bg-muted rounded-lg px-4 py-2 inline-block"
                          )}>
                            {message.role === 'user' ? (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            ) : message.role === 'assistant' ? (
                              <ReactMarkdown
                                className="prose prose-sm dark:prose-invert max-w-none"
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  code: ({ className, children, ...props }) => {
                                    const isInline = !className
                                    return isInline ? (
                                      <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-sm" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="bg-muted-foreground/10 p-2 rounded overflow-x-auto my-2">
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
                              <div className="text-sm text-muted-foreground italic">{message.content}</div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          {(message.role !== 'system') && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{message.timestamp.toLocaleTimeString()}</span>
                              {conversationInfo?.isSaved && message.messageId && index > 0 && (
                                <button
                                  onClick={() => handleCreateBranch(message)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-foreground"
                                >
                                  <GitBranch className="w-3 h-3" />
                                  Branch
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {sendMessageMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5 pt-2">
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* History sidebar */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: '320px', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="border-l bg-muted/10 overflow-hidden"
                    >
                      <div className="p-4 h-full overflow-y-auto">
                        <div className="mb-4">
                          <h3 className="font-semibold mb-2">Recent Conversations</h3>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={historySearch}
                              onChange={(e) => setHistorySearch(e.target.value)}
                              placeholder="Search conversations..."
                              className="pl-8"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {conversationsData?.conversations?.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => openConversation(conv.id)}
                              className="w-full text-left p-3 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all"
                            >
                              <div className="font-medium text-sm truncate">
                                {conv.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(conv.created_at).toLocaleDateString()}
                              </div>
                              {conv.parent_conversation_id && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  <GitBranch className="w-3 h-3 mr-1" />
                                  Branch
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input area */}
              <div className="border-t bg-muted/20 p-4">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                  <div className="relative">
                    <textarea
                      ref={expandedInputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message AI Assistant..."
                      className="w-full min-h-[100px] max-h-[200px] px-4 py-3 pr-14 bg-background border border-border rounded-xl resize-none
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                               placeholder:text-muted-foreground/60"
                      rows={4}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || sendMessageMutation.isPending}
                      className="absolute bottom-3 right-3 rounded-lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-xs text-muted-foreground">
                      {conversationInfo?.isSaved ? 'Conversation saved' : 'Press Enter to send'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Shift+Enter for new line
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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