'use client'

import React from 'react'
import { Settings, Clock, TrendingUp, Tag, DollarSign } from 'lucide-react'

interface RebalancingConfigProps {
  config: {
    timeFrequency: string
    driftFrequency: number
    slippageBudget: number
    optimizer: string
    tags: string[]
    tradableMarkets: string[]
  }
  onChange: (config: any) => void
}

export function RebalancingConfig({ config, onChange }: RebalancingConfigProps) {
  const availableTags = ['macro', 'crypto', 'politics', 'commodities', 'fx', 'rates']
  const availableMarkets = ['Kalshi', 'Polymarket', 'Deribit', 'Binance', 'Coinbase']

  const handleChange = (field: string, value: any) => {
    onChange({ ...config, [field]: value })
  }

  const toggleTag = (tag: string) => {
    const newTags = config.tags.includes(tag)
      ? config.tags.filter(t => t !== tag)
      : [...config.tags, tag]
    handleChange('tags', newTags)
  }

  const toggleMarket = (market: string) => {
    const newMarkets = config.tradableMarkets.includes(market)
      ? config.tradableMarkets.filter(m => m !== market)
      : [...config.tradableMarkets, market]
    handleChange('tradableMarkets', newMarkets)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Rebalancing Configuration</h3>
      </div>

      <div className="space-y-6">
        {/* Time Frequency */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4" />
            <span>Time Frequency</span>
          </label>
          <select
            value={config.timeFrequency}
            onChange={(e) => handleChange('timeFrequency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Drift Frequency */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span>Drift Frequency (%)</span>
          </label>
          <input
            type="number"
            value={config.driftFrequency}
            onChange={(e) => handleChange('driftFrequency', parseInt(e.target.value))}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Rebalance when portfolio drifts by this percentage
          </p>
        </div>

        {/* Slippage Budget */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="h-4 w-4" />
            <span>Slippage Budget (bps)</span>
          </label>
          <input
            type="number"
            value={config.slippageBudget}
            onChange={(e) => handleChange('slippageBudget', parseInt(e.target.value))}
            min="1"
            max="200"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum acceptable slippage in basis points
          </p>
        </div>

        {/* Optimizer */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Optimizer
          </label>
          <select
            value={config.optimizer}
            onChange={(e) => handleChange('optimizer', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="linear">Linear</option>
            <option value="quadratic">Quadratic</option>
            <option value="mean-variance">Mean-Variance</option>
            <option value="black-litterman">Black-Litterman</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Tag className="h-4 w-4" />
            <span>Tags</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  config.tags.includes(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Tradable Markets */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Tradable Markets
          </label>
          <div className="space-y-2">
            {availableMarkets.map(market => (
              <label key={market} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.tradableMarkets.includes(market)}
                  onChange={() => toggleMarket(market)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label={market}
                />
                <span className="text-sm text-gray-700">{market}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}