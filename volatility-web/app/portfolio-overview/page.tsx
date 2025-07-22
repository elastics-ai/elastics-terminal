'use client'

import { ElasticsLayout } from '@/components/layout/elastics-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts'
import { Search, X, RotateCcw, Play, ChevronDown, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioAPI, volatilityAPI } from '@/lib/api'
import { useWebSocket } from '@/lib/websocket'
import { useState, useEffect } from 'react'

// Sample data for cumulative ETH log returns
const ethReturnsData = Array.from({ length: 50 }, (_, i) => ({
  date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
  daytimeReturns: Math.random() * 0.2 - 0.1,
  nighttimeReturns: Math.random() * 0.15 - 0.075,
  totalReturns: Math.random() * 0.25 - 0.125,
}))

// Sample data for distribution histogram
const distributionData = Array.from({ length: 40 }, (_, i) => ({
  bin: -0.02 + (i * 0.001),
  gaussianTotal: Math.exp(-Math.pow((i - 20) / 10, 2)) * 100,
  gaussianDaytime: Math.exp(-Math.pow((i - 18) / 8, 2)) * 80,
  gaussianNighttime: Math.exp(-Math.pow((i - 22) / 12, 2)) * 60,
}))

// Sample data for SPX drawdown scatter
const spxDrawdownData = Array.from({ length: 100 }, (_, i) => ({
  threshold: Math.random() * 0.06 - 0.03,
  drawdown: Math.random() * 0.04 - 0.02,
}))

export default function PortfolioOverviewPage() {
  const [selectedDataSource, setSelectedDataSource] = useState('hyperliquid')
  
  // Fetch portfolio summary
  const { data: portfolioSummary, isLoading: portfolioLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioAPI.getSummary,
    refetchInterval: 5000,
  })

  // Fetch P&L breakdown
  const { data: pnlBreakdown } = useQuery({
    queryKey: ['pnl-breakdown'],
    queryFn: portfolioAPI.getPnLBreakdown,
    refetchInterval: 10000,
  })

  // Fetch volatility surface data
  const { data: volSurface } = useQuery({
    queryKey: ['volatility-surface'],
    queryFn: volatilityAPI.getLatestSurface,
    refetchInterval: 30000,
  })

  // Subscribe to real-time portfolio updates
  useWebSocket('portfolio_update', (data) => {
    console.log('Portfolio update:', data)
  })

  // Calculate metrics from real data
  const portfolioValue = portfolioSummary?.total_value || 2540300
  const cumulativePnL = portfolioSummary?.total_pnl || 1024180
  const cumulativeReturn = portfolioValue > 0 ? ((cumulativePnL / (portfolioValue - cumulativePnL)) * 100) : 60
  const annualReturn = cumulativeReturn / 4.3 // Rough estimate
  const volatility = volSurface?.atm_vol || 38

  return (
    <ElasticsLayout>
      <div className="p-6 space-y-6">
        {/* Portfolio Overview Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Portfolio Overview</h1>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">Polynomial data feed offline</Badge>
            <Button variant="default" className="bg-orange-500 hover:bg-orange-600 text-white">
              Order
            </Button>
          </div>
        </div>

        {/* Portfolio Value Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Portfolio Value</div>
            {portfolioLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-gray-400">Loading...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">${portfolioValue.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">24h</span>
                  <span className="text-sm text-green-600">+${Math.abs(cumulativePnL).toLocaleString()}</span>
                  <span className="text-sm text-green-600">+{cumulativeReturn.toFixed(1)}%</span>
                </div>
              </>
            )}
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Cumulative P&L</div>
            {portfolioLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cumulativePnL >= 0 ? '+' : '-'}${Math.abs(cumulativePnL).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">24h</span>
                  <span className={`text-sm ${portfolioSummary?.day_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioSummary?.day_pnl_percent?.toFixed(2) || '0.00'}%
                  </span>
                </div>
              </>
            )}
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Cumulative Return</div>
            {portfolioLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${cumulativeReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cumulativeReturn >= 0 ? '+' : ''}{cumulativeReturn.toFixed(0)}%
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">YTD</span>
                  <span className={`text-sm ${annualReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {annualReturn >= 0 ? '+' : ''}{annualReturn.toFixed(0)}%
                  </span>
                </div>
              </>
            )}
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500 mb-1">Annual Return</div>
            <div className="text-2xl font-bold">{annualReturn >= 0 ? '+' : ''}{annualReturn.toFixed(0)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Max Drawdown</span>
              <span className="text-sm text-red-600">-26%</span>
            </div>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Annual Volatility</div>
            <div className="text-xl font-semibold">{volatility.toFixed(0)}%</div>
            <div className="text-xs text-green-600">↑ 0.04%</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500">Net Delta</div>
            <div className="text-xl font-semibold">{portfolioSummary?.net_delta?.toFixed(2) || '0.00'}</div>
            <div className="text-xs text-gray-500">Greeks</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Vega</div>
            <div className="text-xl font-semibold">${portfolioSummary?.vega?.toFixed(0) || '0'}</div>
            <div className="text-xs text-gray-500">Volatility exposure</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Theta</div>
            <div className="text-xl font-semibold">${portfolioSummary?.theta?.toFixed(0) || '0'}</div>
            <div className="text-xs text-gray-500">Daily decay</div>
          </Card>
        </div>

        {/* Query Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Query name #1</span>
              <Badge variant="outline" className="text-xs">Show me historical ETH performance in daytime vs. nighttime without outliers. Use log returns.</Badge>
            </div>
            <Button variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Query name #2</label>
              <Input placeholder="Enter query..." />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Query name #3</label>
              <Input placeholder="Enter query..." />
            </div>
            <div className="flex items-end gap-2">
              <Select defaultValue="hyperliquid">
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="okx">OKX</SelectItem>
                </SelectContent>
              </Select>
              <Badge className="bg-purple-100 text-purple-700">Data source: Hyperliquid</Badge>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Where should I source the data from? <span className="font-medium">Binance, Hyperliquid or static data from the library?</span>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cumulative ETH Log Returns */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">Cumulative ETH Log Returns: Total vs Daytime vs Nighttime</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ethReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="totalReturns" stroke="#10b981" strokeWidth={2} dot={false} name="Total Returns" />
                    <Line type="monotone" dataKey="daytimeReturns" stroke="#3b82f6" strokeWidth={2} dot={false} name="Daytime Returns" />
                    <Line type="monotone" dataKey="nighttimeReturns" stroke="#f59e0b" strokeWidth={2} dot={false} name="Nighttime Returns" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Percentiles, Winsorization, or something else?</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span>Use the 2.5th and 97.5th percentiles to filter out outliers</span>
                  </div>
                </div>
                <div className="text-gray-600 mt-2">
                  Got it — trimming returns outside the 95% confidence interval. Do you want to see cumulative performance or return distributions?
                </div>
                <div className="font-medium">Both. Start with cumulative performance, then show me the return distributions with Gaussian overlays.</div>
              </div>
            </Card>

            {/* Distribution of ETH Log Returns */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">Distribution of ETH Log Returns with Gaussian Reference</h3>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-xs">Gaussian Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-xs">Gaussian Daytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-xs">Gaussian Nighttime</span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="gaussianTotal" fill="#3b82f6" opacity={0.6} />
                    <Bar dataKey="gaussianDaytime" fill="#8b5cf6" opacity={0.6} />
                    <Bar dataKey="gaussianNighttime" fill="#f59e0b" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <p className="text-gray-600">Understood. Histogram bins and axis limits are standardized. Gaussian curves are color-coded to match the return series.</p>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">● Blue for Total</span>
                  <span className="text-purple-600">● Green for Daytime</span>
                  <span className="text-orange-600">● Purple for Nighttime</span>
                </div>
              </div>
            </Card>

            {/* SPX Weekly Drawdown Returns */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">SPX Weekly Drawdown Returns vs Following Weekly Returns</h3>
              <div className="flex items-center gap-4 mb-2">
                <Badge variant="outline" className="text-xs">Threshold: -0.25</Badge>
                <Badge variant="outline" className="text-xs">Threshold: -0.5%</Badge>
                <Badge variant="outline" className="text-xs">Threshold: -2%</Badge>
                <Badge variant="outline" className="text-xs">Threshold: -3%</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" dataKey="threshold" tick={{ fontSize: 10 }} />
                    <YAxis type="number" dataKey="drawdown" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Scatter name="SPX Returns" data={spxDrawdownData} fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <p className="text-gray-600">Here's the scatter plot. X-axis shows the weekly drawdown return. Y-axis shows the following week's return. Each threshold is color-coded for clarity.</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="outline" size="sm" className="h-7">
                    <Search className="w-3 h-3 mr-1" />
                    AI Suggestion
                  </Button>
                  <span className="text-gray-600">Would you like to backtest this as a strategy and prepare for live deployment?</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="h-7">Accept</Button>
                  <Button variant="outline" size="sm" className="h-7">Decline</Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Done. Here's the cumulative ETH performance in daytime, Daytime, and Nighttime <br />
              columns (filtered). Now generating a histogram of the log returns with Total, Daytime, and Nighttime <br />
              overlays. Overlays show what normal distributions (Gaussian) with the same mean and <br />
              standard deviation.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Make sure all histograms are on the same scale and clearly <br />
              distinguishable.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Understood. I'll compute the weekly SPX returns, identify weeks with <br />
              drawdowns below each threshold, and then plot the return in the following <br />
              week.
            </p>
            <p className="text-sm text-gray-600">
              Sure. Please specify the drawdown thresholds you want to use — e.g., -2%, -3%, -5%, etc.
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              Use -2%, -3%, and -5% thresholds.
            </p>
            <div className="mt-4">
              <Button variant="secondary">Show Results</Button>
            </div>
          </div>
        </Card>
      </div>
    </ElasticsLayout>
  )
}