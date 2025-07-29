'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, TrendingUp, FileText } from 'lucide-react'
import { ContractScreenerTable } from '@/components/contracts/contract-screener-table'

interface Contract {
  id: string
  contract: string
  price: number
  size: number
  value: number
  pnl: number
  delta: number
  gamma: number
  theta: number
  vega: number
  tags: string[]
  exchange: string
}

export default function ContractScreenerPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExchange, setSelectedExchange] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      // Simulate API call
      setTimeout(() => {
        setContracts([
          {
            id: '1',
            contract: 'BTC_Abov_100k',
            price: 420,
            size: 10000,
            value: 42000,
            pnl: 1800,
            delta: 0.85,
            gamma: 5.2,
            theta: -0.19,
            vega: 11,
            tags: ['btc', 'binary'],
            exchange: 'Polymarket'
          },
          {
            id: '2',
            contract: 'ETH_Over_5k',
            price: 470,
            size: 7500,
            value: 35250,
            pnl: -320,
            delta: 0.78,
            gamma: 4.8,
            theta: -0.1,
            vega: 9,
            tags: ['eth', 'binary'],
            exchange: 'Polymarket'
          },
          {
            id: '3',
            contract: 'Trump_Win',
            price: 580,
            size: 12500,
            value: 72500,
            pnl: 2500,
            delta: 0.92,
            gamma: 6.0,
            theta: -0.2,
            vega: 14,
            tags: ['politics', 'binary'],
            exchange: 'Kalshi'
          },
          {
            id: '4',
            contract: 'US_Recession',
            price: 330,
            size: 9000,
            value: 29700,
            pnl: -1200,
            delta: 0.65,
            gamma: 3.6,
            theta: -0.06,
            vega: 7,
            tags: ['macro', 'binary'],
            exchange: 'Kalshi'
          },
          {
            id: '5',
            contract: 'Inflation_Above',
            price: 580,
            size: 5000,
            value: 29000,
            pnl: 800,
            delta: 0.8,
            gamma: 4.3,
            theta: -0.08,
            vega: 10,
            tags: ['macro', 'binary'],
            exchange: 'Kalshi'
          },
          {
            id: '6',
            contract: 'ETH_50d_Call',
            price: 1500,
            size: 60,
            value: 90000,
            pnl: -150,
            delta: 0.51,
            gamma: 0.03,
            theta: -2.1,
            vega: 4.5,
            tags: ['eth', 'options', 'call'],
            exchange: 'Deribit'
          },
          {
            id: '7',
            contract: 'BTC_75k_Call',
            price: 185,
            size: 50,
            value: 92500,
            pnl: -700,
            delta: 0.62,
            gamma: 0.07,
            theta: -1.6,
            vega: 3.2,
            tags: ['btc', 'options', 'call'],
            exchange: 'Deribit'
          },
          {
            id: '8',
            contract: 'BTC_50k_Put',
            price: 220,
            size: 40,
            value: 88000,
            pnl: 1100,
            delta: -0.4,
            gamma: 0.06,
            theta: -1.4,
            vega: 2.9,
            tags: ['btc', 'options', 'put'],
            exchange: 'Deribit'
          }
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      setLoading(false)
    }
  }

  const allTags = Array.from(new Set(contracts.flatMap(c => c.tags)))
  const exchanges = ['all', ...Array.from(new Set(contracts.map(c => c.exchange)))]

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.contract.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesExchange = selectedExchange === 'all' || contract.exchange === selectedExchange
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => contract.tags.includes(tag))
    
    return matchesSearch && matchesExchange && matchesTags
  })

  const stats = {
    totalContracts: filteredContracts.length,
    totalValue: filteredContracts.reduce((sum, c) => sum + c.value, 0),
    totalPnL: filteredContracts.reduce((sum, c) => sum + c.pnl, 0),
    avgDelta: filteredContracts.reduce((sum, c) => sum + c.delta, 0) / filteredContracts.length || 0
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Contract Screener</h1>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Contracts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalContracts}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(stats.totalValue / 1000).toFixed(0)}K
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total PnL</p>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}${(stats.totalPnL / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Avg Delta</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgDelta.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {exchanges.map(exchange => (
              <option key={exchange} value={exchange}>
                {exchange === 'all' ? 'All Exchanges' : exchange}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Tags:</span>
          </div>
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
                    ? 'bg-blue-600 text-white'
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ContractScreenerTable contracts={filteredContracts} />
      )}

      {!loading && filteredContracts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No contracts found matching your filters</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Model Edge</h3>
        <p className="text-sm text-blue-700">
          Based on current market conditions, contracts with Delta &gt; 0.7 and positive Vega show the highest edge.
          Consider hedging high Theta positions to reduce time decay risk.
        </p>
      </div>
    </div>
  )
}