'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  modules?: string[]
}

const demoMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Show me top opportunities across prediction markets right now.'
  },
  {
    id: '2',
    role: 'assistant',
    content: `Based on combined open interest and volume-weighted signal strength, here are the top binary contracts:

1. Trump wins 2024 (Polymarket)  
2. Rate hike by September (Kalshi)  
3. ETH > $4k by Oct (Polymarket)`,
    modules: ['PolymarketFeed', 'KalshiAPI', 'SignalWeightedVolumeRanker']
  },
  {
    id: '3',
    role: 'user',
    content: 'Is there any arbitrage across venues?'
  },
  {
    id: '4',
    role: 'assistant',
    content: `Yes. Kalshi's "No hike by Sept" = 64¢  
Polymarket's equivalent = 71¢  
Estimated edge after fees: 3.1%`,
    modules: ['CrossVenueEquivalenceMap', 'BinarySpreadScanner']
  },
  {
    id: '5',
    role: 'user',
    content: 'Can you hedge this?'
  },
  {
    id: '6',
    role: 'assistant',
    content: `Constructed delta-neutral hedge using calendar spreads on Deribit.  
✅ cVaR reduction: 23%  
✅ Slippage impact: low`,
    modules: ['DeribitSSVI2024', 'cVaRCalculator', 'DeribitHedger']
  },
  {
    id: '7',
    role: 'user',
    content: 'Show volatility filters for ETH-based contracts.'
  },
  {
    id: '8',
    role: 'assistant',
    content: `| Contract | IV Anomaly | Volume Spike | Action |
|----------|------------|--------------|--------|
| ETH > $4k by Oct (Poly) | +2.7σ ATM skew | +19% | 🔍 Review |
| ETH <$3k in Sept (Kalshi) | -3.1σ wings | Flat | ✅ Stable |`,
    modules: ['IVAnomalyDetector', 'PolymarketFeed', 'KalshiAPI']
  }
]

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={cn("flex gap-3 p-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      
      <div className={cn("flex flex-col gap-2 max-w-[70%]", isUser && "items-end")}>
        <div className={cn(
          "rounded-lg px-4 py-3 whitespace-pre-line",
          isUser 
            ? "bg-gray-100 text-gray-900" 
            : "bg-white border border-gray-200"
        )}>
          {message.content}
        </div>
        
        {message.modules && message.modules.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-xs text-gray-500 font-medium">📦 Modules used:</div>
            {message.modules.map((module, idx) => (
              <div key={idx} className="text-xs text-gray-600 pl-4">
                • {module.includes(':') ? module : `${getModuleType(module)}: ${module}`}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

function getModuleType(module: string): string {
  if (module.includes('Feed') || module.includes('API')) return 'Data Source'
  if (module.includes('Scanner') || module.includes('Detector')) return 'Analysis Engine'
  if (module.includes('Calculator') || module.includes('Ranker')) return 'Computation'
  if (module.includes('Hedger') || module.includes('Executor')) return 'Execution'
  if (module.includes('Map') || module.includes('Matcher')) return 'Mapping Logic'
  if (module.includes('SSVI') || module.includes('Surface')) return 'IV Surface'
  if (module.includes('Filter')) return 'Volatility Filter'
  return 'Module'
}

export function DemoChat() {
  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold">AI Assistant - Prediction Markets</h3>
        <p className="text-sm text-gray-500">Elastics modular architecture demo</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {demoMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </div>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about prediction markets..."
            className="flex-1"
            disabled
            value=""
          />
          <Button disabled size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          This is a demo. Input is disabled.
        </p>
      </div>
    </Card>
  )
}