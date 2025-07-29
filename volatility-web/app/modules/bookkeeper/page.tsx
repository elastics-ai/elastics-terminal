'use client'

import React, { useState } from 'react'
import { BookOpen, TrendingUp, Target, RefreshCw, History } from 'lucide-react'
import { RebalancingConfig } from '@/components/bookkeeper/rebalancing-config'
import { SuggestedTradesTable } from '@/components/bookkeeper/suggested-trades-table'
import { GreeksDisplay } from '@/components/risk/greeks-display'

interface RebalancingLog {
  id: string
  timestamp: string
  type: 'automatic' | 'manual'
  tradesExecuted: number
  totalValue: number
  reason: string
}

export default function BookkeeperPage() {
  const [config, setConfig] = useState({
    timeFrequency: 'daily',
    driftFrequency: 10,
    slippageBudget: 50,
    optimizer: 'quadratic',
    tags: ['macro', 'crypto'],
    tradableMarkets: ['Kalshi', 'Polymarket']
  })

  const [suggestedTrades, setSuggestedTrades] = useState([
    {
      id: '1',
      contract: 'BTC_Above_100k',
      action: 'buy' as const,
      quantity: 100,
      currentPrice: 42.50,
      targetPrice: 45.00,
      impact: 'Delta +0.08',
      reason: 'Increase delta exposure to match target'
    },
    {
      id: '2',
      contract: 'ETH_5k_Call',
      action: 'sell' as const,
      quantity: 50,
      currentPrice: 150.00,
      targetPrice: 145.00,
      impact: 'Vega -0.12',
      reason: 'Reduce vega exposure'
    },
    {
      id: '3',
      contract: 'Trump_Win_2024',
      action: 'buy' as const,
      quantity: 200,
      currentPrice: 48.00,
      targetPrice: 50.00,
      impact: 'Theta +0.05',
      reason: 'Balance theta decay'
    }
  ])

  const targetGreeks = [
    { name: 'Delta', value: 0.50, change: 0, changePercent: 0, description: 'Target delta neutral' },
    { name: 'Gamma', value: 0.10, change: 0, changePercent: 0, description: 'Target gamma exposure' },
    { name: 'Vega', value: 0.20, change: 0, changePercent: 0, description: 'Target vega exposure' },
    { name: 'Theta', value: -0.05, change: 0, changePercent: 0, description: 'Target theta decay' }
  ]

  const currentGreeks = [
    { name: 'Delta', value: 0.42, change: -0.08, changePercent: -16, description: 'Current delta exposure' },
    { name: 'Gamma', value: 0.15, change: 0.05, changePercent: 50, description: 'Current gamma exposure' },
    { name: 'Vega', value: 0.32, change: 0.12, changePercent: 60, description: 'Current vega exposure' },
    { name: 'Theta', value: -0.10, change: -0.05, changePercent: 100, description: 'Current theta decay' }
  ]

  const rebalancingLogs: RebalancingLog[] = [
    {
      id: '1',
      timestamp: '2024-01-15 14:30:00',
      type: 'automatic',
      tradesExecuted: 5,
      totalValue: 25000,
      reason: 'Delta drift exceeded 10% threshold'
    },
    {
      id: '2',
      timestamp: '2024-01-15 09:15:00',
      type: 'manual',
      tradesExecuted: 3,
      totalValue: 15000,
      reason: 'Manual override: Market volatility spike'
    },
    {
      id: '3',
      timestamp: '2024-01-14 16:00:00',
      type: 'automatic',
      tradesExecuted: 8,
      totalValue: 45000,
      reason: 'Scheduled daily rebalancing'
    }
  ]

  const handleApproveTrade = (id: string) => {
    setSuggestedTrades(trades =>
      trades.map(trade =>
        trade.id === id ? { ...trade, approved: true } : trade
      )
    )
  }

  const handleRejectTrade = (id: string) => {
    setSuggestedTrades(trades =>
      trades.map(trade =>
        trade.id === id ? { ...trade, approved: false } : trade
      )
    )
  }

  const handleApproveAll = () => {
    setSuggestedTrades(trades =>
      trades.map(trade => ({ ...trade, approved: true }))
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bookkeeper / Optimizer</h1>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <RefreshCw className="h-4 w-4" />
            <span>Run Optimization</span>
          </button>
        </div>
        
        <p className="text-gray-600">Automated portfolio rebalancing and Greek targeting system</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5 text-gray-600" />
            <span>Target Greeks</span>
          </h3>
          <GreeksDisplay greeks={targetGreeks} />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            <span>Current Greeks</span>
          </h3>
          <GreeksDisplay greeks={currentGreeks} />
        </div>
      </div>

      <div className="mb-6">
        <SuggestedTradesTable
          trades={suggestedTrades}
          onApprove={handleApproveTrade}
          onReject={handleRejectTrade}
          onApproveAll={handleApproveAll}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RebalancingConfig
          config={config}
          onChange={setConfig}
        />
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <History className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rebalancing Logs</h3>
          </div>
          
          <div className="space-y-3">
            {rebalancingLogs.map((log) => (
              <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      log.type === 'automatic' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {log.type === 'automatic' ? 'Automatic' : 'Manual Override'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{log.timestamp}</span>
                </div>
                <p className="text-sm text-gray-900 mb-1">{log.reason}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{log.tradesExecuted} trades executed</span>
                  <span>${log.totalValue.toLocaleString()} total value</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
        <h3 className="text-sm font-medium text-indigo-900 mb-2">Optimization Summary</h3>
        <p className="text-sm text-indigo-700">
          Current portfolio Greeks are within acceptable ranges. Next automatic rebalancing scheduled for tomorrow at 09:00 UTC.
          Manual override available if market conditions change significantly.
        </p>
      </div>
    </div>
  )
}