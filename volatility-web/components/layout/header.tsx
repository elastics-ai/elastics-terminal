'use client'

import { useWebSocketConnection } from '@/lib/websocket'
import { cn } from '@/lib/utils'
import { TimeDisplay } from '@/components/ui/time-display'

export function Header() {
  const isConnected = useWebSocketConnection()

  return (
    <header className="h-14 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <TimeDisplay 
          className="text-sm text-muted-foreground"
          format="time"
          locale="en-US"
          fallback="--:--:-- UTC"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <button className="btn-critical">
          ● Critical 1
        </button>
        <button className="btn-warning">
          ● Warning 4
        </button>
        <button className="btn-info">
          ● Info 14
        </button>
      </div>
    </header>
  )
}