'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Greek {
  name: string
  value: number
  change: number
  changePercent: number
  description: string
}

interface GreeksDisplayProps {
  greeks: Greek[]
  aggregateValue?: number
}

export function GreeksDisplay({ greeks, aggregateValue }: GreeksDisplayProps) {
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)}K`
    }
    return value.toFixed(4)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Greeks</h3>
        {aggregateValue !== undefined && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Aggregate Greeks (USD Notional)</p>
            <p className="text-2xl font-bold text-gray-900">${formatValue(aggregateValue)}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {greeks.map((greek) => (
          <div key={greek.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{greek.name}</h4>
                {getTrendIcon(greek.change)}
              </div>
              <p className="text-sm text-gray-600 mt-1">{greek.description}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-semibold text-gray-900">{formatValue(greek.value)}</p>
              <p className={`text-sm ${getChangeColor(greek.change)}`}>
                {greek.change > 0 ? '+' : ''}{formatValue(greek.change)} ({greek.changePercent > 0 ? '+' : ''}{greek.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Greeks over Time</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Delta</span>
            <div className="flex-1 mx-4 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Gamma</span>
            <div className="flex-1 mx-4 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Vega</span>
            <div className="flex-1 mx-4 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Theta</span>
            <div className="flex-1 mx-4 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}