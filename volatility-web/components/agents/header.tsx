'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function AgentsHeader() {
  const [activeTab, setActiveTab] = useState('builder')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'builder', label: 'Builder' },
    { id: 'backtest', label: 'Backtest' },
    { id: 'trade-history', label: 'Trade History' }
  ]

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Draft</span>
            <input
              type="text"
              placeholder="Quant-Nexus-01"
              className="px-3 py-1 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              defaultValue="Quant-Nexus-01"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Execute
            </button>
            <button className="px-4 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-2">
              <span>Review with AI</span>
            </button>
            <button className="p-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <button className="p-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}