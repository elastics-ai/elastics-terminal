import { useFloatingChat } from '@/contexts/FloatingChatContext'

export const useQuickChat = () => {
  const { setIsOpen, setInitialMessage } = useFloatingChat()

  const openChatWith = (message: string) => {
    setInitialMessage(message)
    setIsOpen(true)
  }

  const openChat = () => {
    setIsOpen(true)
  }

  return {
    openChat,
    openChatWith,
  }
}