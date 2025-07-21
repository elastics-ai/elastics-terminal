'use client'

import { useWebSocket } from '@/lib/websocket'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface IVSliceChartProps {
  sliceType: 'strike' | 'time'
  selectedStrike: number
  selectedExpiry: number
  onToggleSliceType: () => void
}

export function IVSliceChart({ 
  sliceType, 
  selectedStrike, 
  selectedExpiry, 
  onToggleSliceType 
}: IVSliceChartProps) {
  const [surfaceData, setSurfaceData] = useState<any>(null)

  useWebSocket('vol_surface', (message) => {
    if (message?.data?.surface) {
      setSurfaceData(message.data.surface)
    }
  })

  const getSliceData = () => {
    if (!surfaceData) return []
    
    const { strikes = [], expiries = [], ivs = [] } = surfaceData
    
    if (sliceType === 'strike') {
      // Fixed expiry, varying strikes
      const expiryIndex = Math.min(selectedExpiry, expiries.length - 1)
      return strikes.map((strike: number, i: number) => ({
        x: strike,
        y: (ivs[i]?.[expiryIndex] || 0) * 100,
        label: formatNumber(strike, 2)
      }))
    } else {
      // Fixed strike, varying expiries
      const strikeIndex = strikes.findIndex((s: number) => Math.abs(s - selectedStrike) < 0.01) || 0
      return expiries.map((expiry: string, j: number) => ({
        x: j,
        y: (ivs[strikeIndex]?.[j] || 0) * 100,
        label: expiry
      }))
    }
  }

  const data = getSliceData()

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">
          IMPLIED VOLATILITY {sliceType === 'strike' ? 'SMILE' : 'TERM STRUCTURE'}
        </h3>
        <button
          onClick={onToggleSliceType}
          className="px-4 py-2 border border-bloomberg-amber/50 hover:bg-bloomberg-amber/10"
        >
          TOGGLE VIEW
        </button>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#FF880020"
            />
            <XAxis 
              dataKey="label"
              stroke="#FF8800"
              tick={{ fill: '#FF8800', fontSize: 12 }}
              label={{ 
                value: sliceType === 'strike' ? 'Strike/Spot Ratio' : 'Time to Expiry', 
                position: 'insideBottom',
                offset: -5,
                style: { fill: '#FF8800' }
              }}
            />
            <YAxis 
              stroke="#FF8800"
              tick={{ fill: '#FF8800' }}
              label={{ 
                value: 'Implied Volatility (%)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#FF8800' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#000000',
                border: '1px solid #FF8800',
                borderRadius: '4px'
              }}
              labelStyle={{ color: '#FF8800' }}
              formatter={(value: number) => `${formatNumber(value, 1)}%`}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#FF8800"
              strokeWidth={2}
              dot={{ fill: '#FF8800', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-sm text-bloomberg-amber/70">
        {sliceType === 'strike' 
          ? `Showing volatility smile for ${surfaceData?.expiries?.[selectedExpiry] || 'selected'} expiry`
          : `Showing term structure for ${formatNumber(selectedStrike, 2)} strike/spot ratio`
        }
      </div>
    </div>
  )
}