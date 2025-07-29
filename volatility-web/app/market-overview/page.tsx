'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { marketAPI, dataLibraryAPI } from '@/lib/api'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  BarChart3,
  RefreshCw,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

// Mock market data
const marketIndices = [
  { symbol: 'SPX', name: 'S&P 500', price: 4783.25, change: 23.45, changePercent: 0.49, volume: '2.3B' },
  { symbol: 'NDX', name: 'NASDAQ 100', price: 16892.34, change: -45.67, changePercent: -0.27, volume: '1.8B' },
  { symbol: 'DJI', name: 'Dow Jones', price: 37589.23, change: 134.56, changePercent: 0.36, volume: '345M' },
  { symbol: 'BTC', name: 'Bitcoin', price: 52345.67, change: 1234.56, changePercent: 2.41, volume: '24.5B' },
  { symbol: 'ETH', name: 'Ethereum', price: 2987.34, change: -34.56, changePercent: -1.14, volume: '12.3B' },
]

const topMovers = [
  { symbol: 'TSLA', name: 'Tesla Inc', price: 234.56, change: 12.34, changePercent: 5.56, volume: '123M' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 678.90, change: 34.56, changePercent: 5.37, volume: '89M' },
  { symbol: 'AMD', name: 'AMD', price: 123.45, change: 5.67, changePercent: 4.81, volume: '67M' },
  { symbol: 'AAPL', name: 'Apple Inc', price: 189.23, change: -4.56, changePercent: -2.35, volume: '78M' },
  { symbol: 'META', name: 'Meta Platforms', price: 456.78, change: -15.67, changePercent: -3.32, volume: '45M' },
]

const optionsActivity = [
  { contract: 'BTC-29MAR24-60000-C', underlying: 'BTC', strike: 60000, expiry: '29 Mar', volume: 2345, oi: 12345, iv: 68.5 },
  { contract: 'ETH-29MAR24-3500-C', underlying: 'ETH', strike: 3500, expiry: '29 Mar', volume: 1567, oi: 8765, iv: 72.3 },
  { contract: 'BTC-29MAR24-50000-P', underlying: 'BTC', strike: 50000, expiry: '29 Mar', volume: 1234, oi: 6789, iv: 65.2 },
  { contract: 'SOL-29MAR24-150-C', underlying: 'SOL', strike: 150, expiry: '29 Mar', volume: 987, oi: 4567, iv: 85.4 },
  { contract: 'BTC-26APR24-65000-C', underlying: 'BTC', strike: 65000, expiry: '26 Apr', volume: 876, oi: 3456, iv: 71.8 },
]

// Mock intraday data
const intradayData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  spx: 4760 + Math.random() * 40 - 20,
  btc: 51000 + Math.random() * 2000 - 1000,
  volume: Math.random() * 100000000,
}))

export default function MarketOverviewPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D')
  const [selectedMarket, setSelectedMarket] = useState('all')

  // Fetch market data
  const { data: marketSnapshot, isLoading } = useQuery({
    queryKey: ['market-snapshot'],
    queryFn: marketAPI.getSnapshot,
    refetchInterval: 10000,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatVolume = (volume: string) => {
    return volume
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light">Market Overview</h1>
          <div className="flex items-center gap-4">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32 bg-gray-900 border-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1 Day</SelectItem>
                <SelectItem value="1W">1 Week</SelectItem>
                <SelectItem value="1M">1 Month</SelectItem>
                <SelectItem value="YTD">YTD</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last updated: 2 min ago</span>
            </div>
          </div>
        </div>

        {/* Market Indices */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {marketIndices.map((index) => (
            <Card key={index.symbol} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{index.symbol}</span>
                  <Badge 
                    variant={index.change >= 0 ? 'default' : 'destructive'}
                    className={index.change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                  >
                    {formatPercentage(index.changePercent)}
                  </Badge>
                </div>
                <div className="text-2xl font-light mb-1">{formatCurrency(index.price)}</div>
                <div className="flex items-center gap-2 text-sm">
                  {index.change >= 0 ? (
                    <ArrowUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={index.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(index.change).toFixed(2)}
                  </span>
                  <span className="text-gray-400">Vol: {formatVolume(index.volume)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Market Chart */}
          <div className="col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">Market Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={intradayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="spx" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                        name="S&P 500"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="btc" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={false}
                        name="Bitcoin"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Movers */}
            <Card className="bg-gray-900 border-gray-800 mt-6">
              <CardHeader>
                <CardTitle className="text-base font-normal">Top Movers</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMovers.map((stock) => (
                      <TableRow key={stock.symbol} className="border-gray-800">
                        <TableCell className="font-mono">{stock.symbol}</TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stock.price)}</TableCell>
                        <TableCell className="text-right">
                          <span className={stock.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {formatPercentage(stock.changePercent)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-gray-400">{stock.volume}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Options Activity */}
          <div>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">Options Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {optionsActivity.map((option) => (
                  <div key={option.contract} className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{option.contract}</span>
                      <Badge variant="outline" className="text-xs">
                        IV: {option.iv}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Volume:</span>{' '}
                        <span className="font-medium">{option.volume.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">OI:</span>{' '}
                        <span className="font-medium">{option.oi.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Market Stats */}
            <Card className="bg-gray-900 border-gray-800 mt-6">
              <CardHeader>
                <CardTitle className="text-base font-normal">Market Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Advancing</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-medium">1,234</span>
                    <Badge className="bg-green-500/10 text-green-500">65%</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Declining</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-medium">567</span>
                    <Badge className="bg-red-500/10 text-red-500">30%</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Unchanged</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium">89</span>
                    <Badge className="bg-gray-500/10 text-gray-500">5%</Badge>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Put/Call Ratio</span>
                    <span className="font-medium">0.85</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">VIX</span>
                    <span className="font-medium">14.25</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Market Cap</span>
                    <span className="font-medium">$42.3T</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}