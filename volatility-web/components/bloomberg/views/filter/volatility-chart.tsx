'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/lib/websocket'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatNumber } from '@/lib/utils'

interface VolatilityData {
  timestamp: number
  volatility: number
  threshold: number
}

export function VolatilityChart() {
  const [data, setData] = useState<VolatilityData[]>([])
  const [currentVolatility, setCurrentVolatility] = useState<number>(0)
  const [threshold, setThreshold] = useState<number>(0.5)

  useWebSocket('volatility_estimate', (message) => {
    if (message?.data) {
      const newData: VolatilityData = {
        timestamp: message.timestamp,
        volatility: message.data.volatility || 0,
        threshold: message.data.threshold || threshold
      }
      
      setCurrentVolatility(newData.volatility)
      setThreshold(newData.threshold)
      
      setData(prev => {
        const updated = [...prev, newData]
        // Keep only last 50 points
        if (updated.length > 50) {
          return updated.slice(-50)
        }
        return updated
      })
    }
  })

  const chartData = data.map((d, index) => ({
    index,
    volatility: d.volatility * 100, // Convert to percentage
    threshold: d.threshold * 100
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Realized Volatility</h3>
        <div className="text-sm space-x-4">
          <span className="text-gray-600">
            Current: <span className="font-semibold text-gray-900">{formatNumber(currentVolatility * 100, 2)}%</span>
          </span>
          <span className="text-gray-600">
            Threshold: <span className="font-semibold text-red-600">{formatNumber(threshold * 100, 2)}%</span>
          </span>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb"
            />
            <XAxis 
              dataKey="index"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              label={{ 
                value: 'Volatility (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#6b7280', fontSize: 14 }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px'
              }}
              labelStyle={{ color: '#6b7280', fontSize: 12 }}
              itemStyle={{ color: '#111827', fontSize: 12 }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <ReferenceLine 
              y={threshold * 100} 
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ 
                value: "Threshold", 
                fill: '#ef4444',
                position: 'right'
              }}
            />
            <Line
              type="monotone"
              dataKey="volatility"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}