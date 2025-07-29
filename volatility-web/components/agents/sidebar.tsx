'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationItem {
  id: string
  title: string
  sentiment: 'positive' | 'negative' | 'neutral'
  timestamp: string
  trigger?: string
}

export function AgentsSidebar() {
  const [expandedSection, setExpandedSection] = useState<string | null>('analysis')

  const conversations: ConversationItem[] = [
    {
      id: '1',
      title: 'Microsoft announces new partnership with Open AI to integrate Copilot across Azure ecosystem.',
      sentiment: 'positive',
      timestamp: 'Yes',
      trigger: '#Microsoft #AI #Azure'
    },
    {
      id: '2',
      title: 'Spotify Q2 earnings beat expectations with strong ad-supported user growth in emerging markets.',
      sentiment: 'positive',
      timestamp: 'Yes',
      trigger: '#Spotify #Earnings #Growth'
    },
    {
      id: '3',
      title: 'SEC initiates inquiry into Spotify\'s podcast acquisition practices, shares dip in pre-market.',
      sentiment: 'negative',
      timestamp: 'No',
      trigger: '#Spotify #Regulation #Risk'
    }
  ]

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <button
            onClick={() => toggleSection('analysis')}
            className="flex items-center gap-1"
          >
            {expandedSection === 'analysis' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Sentiment Analysis
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            Function
          </span>
        </h3>
      </div>

      {expandedSection === 'analysis' && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Account to Track</label>
              <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/20">
                <span className="text-xs text-muted-foreground">@Deltaone</span>
                <span className="text-xs text-muted-foreground">@DBNewswire</span>
                <span className="text-xs text-muted-foreground">@Tier10k</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Topic</label>
              <div className="p-2 border border-border rounded-md bg-muted/20">
                <p className="text-xs">Macro Event (war, tariffs, virus)</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                Sentiment
                <span className="text-muted-foreground/60">Extremely Negative</span>
                <ChevronDown className="w-3 h-3" />
              </label>
            </div>

            <div className="space-y-3 pt-3">
              <h4 className="text-xs font-medium text-muted-foreground">Tweets</h4>
              {conversations.map((item) => (
                <div key={item.id} className="space-y-2 p-3 border border-border rounded-lg bg-card">
                  <p className="text-xs leading-relaxed">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.trigger}</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Bullish
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Trigger: <span className="text-foreground">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border bg-muted/10">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium">Backtest this Agent over the last 30 days</p>
            <p className="text-xs text-muted-foreground">Summarize this Agent's logic</p>
            <p className="text-xs text-muted-foreground">Suggest improvements to this Agent</p>
            <p className="text-xs text-muted-foreground">Deploy this Agent live</p>
          </div>
        </div>
        <div className="mt-3">
          <input
            type="text"
            placeholder="Ask anything..."
            className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}