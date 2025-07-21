'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { cn } from '@/lib/utils'
import { FormattedTime } from '@/components/ui/formatted-time'

const timeframes = ['1W', '1M', '3M', 'YTD', '1Y']

// Mock data
const generateData = (points: number) => {
  const data = []
  const baseValue = 100
  for (let i = 0; i < points; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (points - i))
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: baseValue + Math.random() * 40 - 10,
      benchmark: baseValue + Math.random() * 20 - 5,
    })
  }
  return data
}

export function PerformanceChart() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('3M')
  const [selectedMetric, setSelectedMetric] = useState('returns')
  
  const data = generateData(90)

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Performance Breakdown</h2>
        
        <div className="flex items-center gap-4">
          {/* Metric Selector */}
          <div className="flex gap-1 bg-secondary rounded-md p-1">
            <button
              onClick={() => setSelectedMetric('returns')}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                selectedMetric === 'returns'
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cumulative Returns
            </button>
            <button
              onClick={() => setSelectedMetric('alpha')}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                selectedMetric === 'alpha'
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Alpha/Beta
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  selectedTimeframe === tf
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#666"
              tick={{ fontSize: 12 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
              }}
            />
            <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="hsl(237, 84%, 65%)"
              strokeWidth={2}
              dot={false}
              name="Portfolio"
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#666"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Benchmark"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary"></div>
          <span className="text-sm text-muted-foreground">Portfolio</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-400 border-dashed"></div>
          <span className="text-sm text-muted-foreground">Benchmark</span>
        </div>
      </div>
    </div>
  )
}