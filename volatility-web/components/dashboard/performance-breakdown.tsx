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

  const currentMetrics = {
    portfolio: { value: 24, change: -4.58, benchmark: 0.21 },
    alpha: { value: 0.15, label: '24h', change: 0.00 },
    beta: { value: 0.4, label: 'Beta: 0.31', change: 0.00 }
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Performance Breakdown</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors",
                selectedRange === range.value
                  ? "bg-black text-white"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cumulative Returns Chart */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">Cumulative Returns</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[hsl(var(--chart-primary))]"></span>
                <span className="text-muted-foreground">Portfolio</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gray-400"></span>
                <span className="text-muted-foreground">Benchmark</span>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{currentMetrics.portfolio.value}%</span>
              <span className="text-sm font-medium text-red-600">
                {currentMetrics.portfolio.change}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Benchmark: {currentMetrics.portfolio.benchmark}%
            </p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  stroke="#999"
                  interval="preserveStartEnd"
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  stroke="#999"
                  tickFormatter={(value) => `${value}%`}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  stroke="hsl(var(--chart-primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  stroke="#999" 
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">Alpha/Beta</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gray-900"></span>
                <span className="text-muted-foreground">Alpha</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gray-400"></span>
                <span className="text-muted-foreground">Beta</span>
              </div>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{currentMetrics.alpha.value}</span>
                <span className="status-badge bg-black text-white text-[10px]">
                  {currentMetrics.alpha.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">0.00</p>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{currentMetrics.beta.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{currentMetrics.beta.label}</p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }} 
                  stroke="#999"
                  interval="preserveStartEnd"
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11 }} 
                  stroke="#999"
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }} 
                  stroke="#999"
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="alpha" 
                  stroke="#000" 
                  strokeWidth={2}
                  dot={false}
                  name="Alpha"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="beta" 
                  stroke="#999" 
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