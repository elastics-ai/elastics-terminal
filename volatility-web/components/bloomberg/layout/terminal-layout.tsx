'use client'

import { CommandBar } from './command-bar'
import { useWebSocketConnection } from '@/lib/websocket'
import { cn } from '@/lib/utils'
import { TimeDisplay } from '@/components/ui/time-display'

interface TerminalLayoutProps {
  children: React.ReactNode
  title?: string
}

export function TerminalLayout({ children, title }: TerminalLayoutProps) {
  const isConnected = useWebSocketConnection()

  return (
    <div className="min-h-screen bg-black text-bloomberg-amber font-mono">
      {/* Header */}
      <header className="border-b border-bloomberg-amber/30">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">VOLATILITY TERMINAL</h1>
            {title && (
              <>
                <span className="text-bloomberg-amber/50">/</span>
                <span className="text-lg">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className={cn(
              "flex items-center gap-2",
              isConnected ? "text-positive" : "text-negative"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-positive" : "bg-negative animate-blink"
              )} />
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </div>
            <TimeDisplay 
              className="text-bloomberg-amber/70"
              fallback="--:--:--"
            />
          </div>
        </div>
        <CommandBar />
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-bloomberg-amber/30 px-4 py-1">
        <div className="flex items-center justify-between text-xs text-bloomberg-amber/70">
          <div className="flex items-center gap-4">
            <span>F1=HELP</span>
            <span>ESC=CLEAR</span>
            <span>TAB=COMPLETE</span>
          </div>
          <div>
            © 2024 Volatility Terminal
          </div>
        </div>
      </footer>
    </div>
  )
}