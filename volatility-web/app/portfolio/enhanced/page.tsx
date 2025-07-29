'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Info,
  Search,
  Upload,
  Filter,
  ChevronRight,
  Activity,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react'

const COLORS = {
  'ETH': '#627EEA',
  'BTC': '#F7931A',
  'SOL': '#9945FF',
  'LINK': '#375BD2',
  'XRP': '#23292F',
  'Binance': '#F0B90B',
  'Deribit': '#0E9F6E',
  'PKX': '#7C3AED',
  'BKK': '#EF4444',
}

export default function EnhancedPortfolioPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch portfolio data
  const { data: overview, isLoading } = useQuery({
    queryKey: ['portfolio-overview'],
    queryFn: portfolioAPI.getOverview,
    refetchInterval: 30000,
  })

  const { data: performance } = useQuery({
    queryKey: ['portfolio-performance', selectedTimeframe],
    queryFn: () => portfolioAPI.getPerformance(selectedTimeframe),
    refetchInterval: 30000,
  })

  const { data: allocation } = useQuery({
    queryKey: ['portfolio-allocation'],
    queryFn: portfolioAPI.getAllocation,
    refetchInterval: 30000,
  })

  // Mock data for charts
  const cumulativeReturnsData = [
    { date: '2023-06-29', value: 0 },
    { date: '2023-08-01', value: 0.05 },
    { date: '2023-09-01', value: 0.08 },
    { date: '2023-10-01', value: 0.12 },
    { date: '2023-11-01', value: 0.10 },
    { date: '2024-01-01', value: 0.15 },
    { date: '2024-01-15', value: 0.19 },
  ]

  const volumeByStrategyData = [
    { date: '2023-06-29', value: 500000 },
    { date: '2023-07-15', value: 750000 },
    { date: '2023-08-01', value: 900000 },
    { date: '2023-09-01', value: 650000 },
    { date: '2023-10-01', value: 1100000 },
    { date: '2023-11-01', value: 850000 },
    { date: '2024-01-01', value: 1200000 },
  ]

  const drawdownData = [
    { date: '2023-06-29', value: 0 },
    { date: '2023-07-15', value: -0.05 },
    { date: '2023-08-01', value: -0.12 },
    { date: '2023-08-15', value: -0.08 },
    { date: '2023-09-01', value: -0.03 },
    { date: '2023-10-01', value: -0.15 },
    { date: '2023-11-01', value: -0.10 },
    { date: '2024-01-01', value: -0.05 },
  ]

  const returnDistributionData = Array.from({ length: 50 }, (_, i) => ({
    value: -0.03 + (i * 0.06 / 50),
    frequency: Math.exp(-Math.pow(i - 25, 2) / 100),
  }))

  const sharpeRatioData = [
    { date: '2023-06-29', value: 0.5 },
    { date: '2023-07-15', value: 0.8 },
    { date: '2023-08-01', value: 1.2 },
    { date: '2023-09-01', value: 0.9 },
    { date: '2023-10-01', value: 1.5 },
    { date: '2023-11-01', value: 1.8 },
    { date: '2024-01-01', value: 2.1 },
  ]

  const annualizedVolData = [
    { date: '2023-06-29', value: 0.12 },
    { date: '2023-07-15', value: 0.15 },
    { date: '2023-08-01', value: 0.18 },
    { date: '2023-09-01', value: 0.14 },
    { date: '2023-10-01', value: 0.16 },
    { date: '2023-11-01', value: 0.13 },
    { date: '2024-01-01', value: 0.15 },
  ]

  const outerRingData = [
    { name: 'Binance', value: 40, color: COLORS['Binance'] },
    { name: 'Deribit', value: 15, color: COLORS['Deribit'] },
    { name: 'PKX', value: 25, color: COLORS['PKX'] },
    { name: 'BKK', value: 20, color: COLORS['BKK'] },
  ]

  const innerRingData = [
    { name: 'ETH', value: 31, color: COLORS['ETH'] },
    { name: 'BTC', value: 17, color: COLORS['BTC'] },
    { name: 'SOL', value: 12, color: COLORS['SOL'] },
    { name: 'LINK', value: 8, color: COLORS['LINK'] },
    { name: 'XRP', value: 6, color: COLORS['XRP'] },
    { name: 'Others', value: 26, color: '#6B7280' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light">Portfolio</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Critical 3
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                <AlertTriangle className="w-3 h-3" />
                Warning 2
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Info className="w-3 h-3" />
                Info 4
              </Badge>
            </div>
            <span className="text-sm text-gray-400">09:11:43 UTC</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-7 gap-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-400">Active Strategies</div>
            <div className="text-xl font-light">1</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Total Returns</div>
            <div className="text-xl font-light text-green-500">{formatPercentage(overview?.cumulative_return || 18.7)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Cumulative Return</div>
            <div className="text-xl font-light text-green-500">{formatPercentage(60)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Annual Return</div>
            <div className="text-xl font-light text-green-500">{formatPercentage(14)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Max Drawdown</div>
            <div className="text-xl font-light text-red-500">{formatPercentage(-26)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Annual Volatility</div>
            <div className="text-xl font-light">38%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Annual Volatility</div>
            <div className="text-xl font-light">38%</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="graphs" className="space-y-6">
          <TabsList className="bg-gray-900">
            <TabsTrigger value="graphs">Graphs</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
          </TabsList>

          <TabsContent value="graphs" className="space-y-6">
            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Cumulative Returns */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Cumulative Returns (Equity Curves)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumulativeReturnsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => formatPercentage(v * 100)} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          formatter={(value: any) => formatPercentage(value * 100)}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trading Volume */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Daily Trading Volume by Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volumeByStrategyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => `${v/1000}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8B5CF6" 
                          fill="#8B5CF6"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Drawdowns */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Drawdowns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={drawdownData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => formatPercentage(v * 100)} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          formatter={(value: any) => formatPercentage(value * 100)}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#EF4444" 
                          fill="#EF4444"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Return Distributions */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Strategy Return Distributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={returnDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="value" tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => formatPercentage(v * 100)} />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                        />
                        <Bar 
                          dataKey="frequency" 
                          fill="#6366F1"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Rolling Sharpe Ratios */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Rolling Sharpe Ratios (30-Day)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sharpeRatioData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Rolling Annualized Volatility */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Rolling Annualized Volatility (30-Day)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={annualizedVolData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" tickFormatter={(v) => formatPercentage(v * 100)} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          formatter={(value: any) => formatPercentage(value * 100)}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                {/* AI Queries Section */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base font-normal">AI-Powered Queries</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Input 
                          placeholder="Ask anything..."
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Ask
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm">Set the benchmark to top 20 altcoin basket</p>
                      </div>
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm">Which strategy contributed most to volatility in June?</p>
                      </div>
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm">Breakdown PnL contribution by exchange</p>
                      </div>
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <p className="text-sm">What tags dominate profitable trades?</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                {/* Portfolio Allocation */}
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-normal">Allocation</CardTitle>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          1W
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          1M
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          YTD
                        </Button>
                        <Button size="sm" variant="secondary" className="h-7 text-xs">
                          1Y
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Combined
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          Individual
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Select defaultValue="relative">
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relative">Relative</SelectItem>
                          <SelectItem value="absolute">Absolute</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="text-sm text-gray-400">Benchmark</div>
                      <Select defaultValue="sp500">
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sp500">S&P 500</SelectItem>
                          <SelectItem value="btc">Bitcoin</SelectItem>
                          <SelectItem value="eth">Ethereum</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="text-sm text-gray-400">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">All Tags</Badge>
                      </div>

                      {/* Donut Chart */}
                      <div className="h-[300px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={outerRingData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {outerRingData.map((entry, index) => (
                                <Cell key={`outer-cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Pie
                              data={innerRingData}
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              fill="#82ca9d"
                              dataKey="value"
                            >
                              {innerRingData.map((entry, index) => (
                                <Cell key={`inner-cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <div className="text-sm text-gray-400">Total</div>
                            <div className="text-xl font-light">100%</div>
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">Outer Ring</div>
                        <div className="grid grid-cols-2 gap-2">
                          {outerRingData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs">{item.name}</span>
                              <span className="text-xs text-gray-400 ml-auto">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-sm text-gray-400 mt-4">Inner Ring</div>
                        <div className="grid grid-cols-2 gap-2">
                          {innerRingData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs">{item.name}</span>
                              <span className="text-xs text-gray-400 ml-auto">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button variant="outline" className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategies">
            <div className="text-center py-12 text-gray-400">
              Strategies content coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}