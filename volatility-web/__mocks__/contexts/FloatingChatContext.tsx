import React from 'react'

export const useFloatingChat = () => ({
  isOpen: false,
  openFloatingChat: jest.fn(),
  closeFloatingChat: jest.fn(),
  toggleFloatingChat: jest.fn(),
  position: { x: 0, y: 0 },
  setPosition: jest.fn(),
  chats: [],
  currentChatId: null,
  setCurrentChatId: jest.fn(),
  addChat: jest.fn(),
  sendMessage: jest.fn(),
  closeChat: jest.fn(),
  clearChats: jest.fn(),
})

export const FloatingChatProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}