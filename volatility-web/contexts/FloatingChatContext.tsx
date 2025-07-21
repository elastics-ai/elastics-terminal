'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ConversationInfo {
  id: number
  title: string
  parentId?: number
  parentMessageId?: number
  isSaved: boolean
}

interface FloatingChatContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleChat: () => void
  initialMessage?: string
  setInitialMessage: (message: string) => void
  clearInitialMessage: () => void
  // Conversation management
  conversationInfo?: ConversationInfo
  setConversationInfo: (info: ConversationInfo | undefined) => void
  clearConversation: () => void
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(undefined)

export const useFloatingChat = () => {
  const context = useContext(FloatingChatContext)
  if (!context) {
    throw new Error('useFloatingChat must be used within a FloatingChatProvider')
  }
  return context
}

interface FloatingChatProviderProps {
  children: ReactNode
}

export const FloatingChatProvider: React.FC<FloatingChatProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [initialMessage, setInitialMessage] = useState<string>()
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo>()

  const toggleChat = () => setIsOpen(!isOpen)
  
  const clearInitialMessage = () => setInitialMessage(undefined)
  
  const clearConversation = () => {
    setConversationInfo(undefined)
  }

  return (
    <FloatingChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleChat,
        initialMessage,
        setInitialMessage,
        clearInitialMessage,
        conversationInfo,
        setConversationInfo,
        clearConversation,
      }}
    >
      {children}
    </FloatingChatContext.Provider>
  )
}