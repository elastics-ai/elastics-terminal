'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  modules?: string[]
  action?: {
    type: string
    label: string
    url: string
    params?: any
  }
}

interface DemoChatContextType {
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  inputValue: string
  setInputValue: (value: string) => void
}

const DemoChatContext = createContext<DemoChatContextType | undefined>(undefined)

export function DemoChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Load messages from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('demoChatMessages')
      const savedExpanded = localStorage.getItem('demoChatExpanded')
      
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages))
        } catch (e) {
          console.error('Failed to parse saved messages:', e)
        }
      }
      
      if (savedExpanded) {
        setIsExpanded(savedExpanded === 'true')
      }
      
      setIsInitialized(true)
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('demoChatMessages', JSON.stringify(messages))
    }
  }, [messages, isInitialized])

  // Save expanded state to localStorage
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('demoChatExpanded', String(isExpanded))
    }
  }, [isExpanded, isInitialized])

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const clearMessages = () => {
    setMessages([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demoChatMessages')
    }
  }

  return (
    <DemoChatContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
        isExpanded,
        setIsExpanded,
        inputValue,
        setInputValue
      }}
    >
      {children}
    </DemoChatContext.Provider>
  )
}

export function useDemoChat() {
  const context = useContext(DemoChatContext)
  if (context === undefined) {
    throw new Error('useDemoChat must be used within a DemoChatProvider')
  }
  return context
}