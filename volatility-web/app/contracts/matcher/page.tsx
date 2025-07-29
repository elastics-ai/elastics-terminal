'use client'

import React, { useState, useEffect } from 'react'
import { GitCompare, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { ContractMatcherTable } from '@/components/contracts/contract-matcher-table'

interface ContractMatch {
  id: string
  event: string
  kalshiPrice: number | null
  polymarketPrice: number | null
  deribitPrice: number | null
  spread: number
  spreadPercent: number
  recommendation: string
  potentialProfit: number
  tags: string[]
}

export default function ContractMatcherPage() {
  const [matches, setMatches] = useState<ContractMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [minSpread, setMinSpread] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMatches = async () => {
    try {
      // Simulate API call
      setTimeout(() => {
        setMatches([
          {
            id: '1',
            event: 'Trump Win 2024',
            kalshiPrice: 48,
            polymarketPrice: 52,
            deribitPrice: null,
            spread: 4,
            spreadPercent: 8.3,
            recommendation: 'Buy Kalshi, Sell Polymarket',
            potentialProfit: 400,
            tags: ['arbitrage', 'politics']
          },
          {
            id: '2',
            event: 'BTC Above 100k',
            kalshiPrice: 32,
            polymarketPrice: 35,
            deribitPrice: 38,
            spread: 6,
            spreadPercent: 18.8,
            recommendation: 'Buy Kalshi, Sell Deribit',
            potentialProfit: 600,
            tags: ['crypto', 'spread']
          },
          {
            id: '3',
            event: 'Fed Rate Cut Q2',
            kalshiPrice: 65,
            polymarketPrice: 58,
            deribitPrice: null,
            spread: 7,
            spreadPercent: 10.8,
            recommendation: 'Buy Polymarket, Sell Kalshi',
            potentialProfit: 700,
            tags: ['macro', 'arbitrage']
          },
          {
            id: '4',
            event: 'ETH Above 5k',
            kalshiPrice: 42,
            polymarketPrice: 45,
            deribitPrice: 41,
            spread: 4,
            spreadPercent: 9.8,
            recommendation: 'Buy Deribit, Sell Polymarket',
            potentialProfit: 400,
            tags: ['crypto', 'spread']
          },
          {
            id: '5',
            event: 'US Recession 2024',
            kalshiPrice: 28,
            polymarketPrice: 33,
            deribitPrice: null,
            spread: 5,
            spreadPercent: 17.9,
            recommendation: 'Buy Kalshi, Sell Polymarket',
            potentialProfit: 500,
            tags: ['macro', 'bearish']
          },
          {
            id: '6',
            event: 'Oil Above $100',
            kalshiPrice: 55,
            polymarketPrice: 51,
            deribitPrice: null,
            spread: 4,
            spreadPercent: 7.3,
            recommendation: 'Buy Polymarket, Sell Kalshi',
            potentialProfit: 400,
            tags: ['commodities', 'energy']
          }
        ])
        setLastUpdate(new Date())
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch matches:', error)
      setLoading(false)
    }
  }

  const allTags = Array.from(new Set(matches.flatMap(m => m.tags)))

  const filteredMatches = matches.filter(match => {
    const meetsSpreadRequirement = match.spreadPercent >= minSpread
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => match.tags.includes(tag))
    
    return meetsSpreadRequirement && matchesTags
  })

  const stats = {
    totalMatches: filteredMatches.length,
    avgSpread: filteredMatches.reduce((sum, m) => sum + m.spreadPercent, 0) / filteredMatches.length || 0,
    totalPotentialProfit: filteredMatches.reduce((sum, m) => sum + m.potentialProfit, 0),
    highestSpread: Math.max(...filteredMatches.map(m => m.spreadPercent), 0)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <GitCompare className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Contract Matcher</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
            <button 
              onClick={fetchMatches}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Arbitrage Opportunities</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Average Spread</p>
            <p className="text-2xl font-bold text-purple-600">{stats.avgSpread.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Potential Profit</p>
            <p className="text-2xl font-bold text-green-600">${stats.totalPotentialProfit}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Highest Spread</p>
            <p className="text-2xl font-bold text-orange-600">{stats.highestSpread.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600">Minimum Spread:</label>
          <input
            type="range"
            min="0"
            max="20"
            value={minSpread}
            onChange={(e) => setMinSpread(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium text-gray-900 w-12">{minSpread}%</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Filter by tags:</span>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev =>
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  )
                }}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          <ContractMatcherTable matches={filteredMatches} />
          
          {filteredMatches.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mt-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-500">No matches found with spread ≥ {minSpread}%</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Best Opportunity
              </h3>
              <p className="text-sm text-green-700">
                {filteredMatches.length > 0 
                  ? `${filteredMatches.sort((a, b) => b.spreadPercent - a.spreadPercent)[0].event} with ${filteredMatches[0].spreadPercent}% spread`
                  : 'No opportunities available'}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Market Insights</h3>
              <p className="text-sm text-blue-700">
                Cross-market inefficiencies detected. Consider position sizing based on liquidity and settlement times.
                Kalshi offers regulated markets while Polymarket provides decentralized options.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}