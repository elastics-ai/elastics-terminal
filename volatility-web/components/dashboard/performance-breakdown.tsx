'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

const timeRanges = [
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M', active: true },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
]

export function PerformanceBreakdown() {
  const [selectedRange, setSelectedRange] = useState('3M')
  
  const { data: performance } = useQuery({
    queryKey: ['portfolio-performance'],
    queryFn: portfolioAPI.getPerformance,
    refetchInterval: 30000,
  })

  // Generate mock data for demonstration
  const chartData = Array.from({ length: 90 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (90 - i))
    
    const base = 10
    const trend = i * 0.2
    const noise = Math.sin(i * 0.1) * 5
    const portfolio = base + trend + noise
    
    const benchmarkBase = 5
    const benchmarkTrend = i * 0.15
    const benchmarkNoise = Math.sin(i * 0.15) * 3
    const benchmark = benchmarkBase + benchmarkTrend + benchmarkNoise
    
    const alpha = 0.15 + (Math.random() * 0.1 - 0.05)
    const beta = 0.4 + (Math.random() * 0.2 - 0.1)
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: Number(portfolio.toFixed(2)),
      benchmark: Number(benchmark.toFixed(2)),
      alpha: Number(alpha.toFixed(3)),
      beta: Number(beta.toFixed(3)),
    }
  })

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Performance Breakdown</h3>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-md p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                selectedRange === range.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Cumulative Returns Chart */}
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Cumulative Returns</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  stroke="#6B7280"
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  stroke="#6B7280"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  stroke="#5B8DEF" 
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  stroke="#6B7280" 
                  strokeWidth={2}
                  dot={false}
                  name="Benchmark"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alpha/Beta Chart */}
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Alpha/Beta</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55, 65, 81, 0.3)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  stroke="#6B7280"
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10 }} 
                  stroke="#6B7280"
                  label={{ value: 'Alpha', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }} 
                  stroke="#6B7280"
                  label={{ value: 'Beta', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconType="line"
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="alpha" 
                  stroke="#5B8DEF" 
                  strokeWidth={2}
                  dot={false}
                  name="Alpha"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="beta" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  name="Beta"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}