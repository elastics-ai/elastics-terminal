'use client'

import React from 'react'
import { Tooltip } from '@/components/ui/tooltip'

interface RiskData {
  category: string
  subcategory: string
  value: number // 0-1 scale
  label: string
}

interface RiskHeatmapProps {
  data: RiskData[]
}

export function RiskHeatmap({ data }: RiskHeatmapProps) {
  // Group data by category
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, RiskData[]>)

  const getColorClass = (value: number) => {
    if (value >= 0.7) return 'bg-red-600'
    if (value >= 0.5) return 'bg-orange-500'
    if (value >= 0.3) return 'bg-yellow-500'
    return 'bg-green-600'
  }

  const getTextColorClass = (value: number) => {
    if (value >= 0.5) return 'text-white'
    return 'text-gray-900'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Breakdown</h3>
      
      <div className="space-y-4">
        {Object.entries(groupedData).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
            <div className="grid grid-cols-4 gap-2">
              {items.map((item) => (
                <div
                  key={`${item.category}-${item.subcategory}`}
                  data-testid={`heatmap-cell-${item.category}-${item.subcategory}`}
                  className={`relative p-3 rounded-lg ${getColorClass(item.value)} ${getTextColorClass(item.value)} transition-all hover:scale-105 cursor-pointer`}
                >
                  <div className="text-xs font-medium">{item.subcategory}</div>
                  <div className="text-lg font-bold mt-1">{(item.value * 100).toFixed(0)}%</div>
                  <div className="text-xs opacity-80">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>Critical Risk</span>
          </div>
        </div>
      </div>
    </div>
  )
}