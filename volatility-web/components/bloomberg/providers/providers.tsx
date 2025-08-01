'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider as JotaiProvider } from 'jotai'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { wsClient } from '@/lib/websocket'
import { FloatingChatProvider } from '@/contexts/FloatingChatContext'
import { DemoChatProvider } from '@/contexts/DemoChatContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize WebSocket connection
  useEffect(() => {
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <FloatingChatProvider>
            <DemoChatProvider>
              {children}
            </DemoChatProvider>
          </FloatingChatProvider>
        </ThemeProvider>
      </JotaiProvider>
    </QueryClientProvider>
  )
}