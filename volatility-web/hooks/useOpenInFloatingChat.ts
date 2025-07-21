'use client'

import { useFloatingChat } from '@/contexts/FloatingChatContext'
import { useRouter } from 'next/navigation'

export function useOpenInFloatingChat() {
  const { setIsOpen, setConversationInfo } = useFloatingChat()
  const router = useRouter()

  const openConversationInFloatingChat = (conversation: {
    id: number
    title: string
    parent_id?: number
    parent_message_id?: number
  }) => {
    // Set the conversation info
    setConversationInfo({
      id: conversation.id,
      title: conversation.title,
      parentId: conversation.parent_id,
      parentMessageId: conversation.parent_message_id,
      isSaved: true
    })

    // Open the floating chat
    setIsOpen(true)

    // Navigate back to home or previous page
    router.push('/')
  }

  const openNewFloatingChat = (initialMessage?: string) => {
    // Clear any existing conversation
    setConversationInfo(undefined)
    
    // Open the floating chat
    setIsOpen(true)
  }

  return {
    openConversationInFloatingChat,
    openNewFloatingChat
  }
}