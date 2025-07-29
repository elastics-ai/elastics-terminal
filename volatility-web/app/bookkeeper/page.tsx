'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataLibraryAPI } from '@/lib/api'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { 
  AlertTriangle, 
  Info,
  Plus,
  RefreshCw,
  Check,
  X,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface GreeksLimit {
  metric: string
  targetMin: number | null
  targetMax: number | null
  targetValue: number | null
  current: number
  maxDelta: number
}

const greeksLimits: GreeksLimit[] = [
  { metric: 'Delta', targetMin: null, targetMax: null, targetValue: 0.0, current: 32000, maxDelta: 32000.0 },
  { metric: 'Gamma', targetMin: 0.0, targetMax: 5000.0, targetValue: null, current: 1800, maxDelta: 3200.0 },
  { metric: 'Vega', targetMin: -250000, targetMax: 25000.0, targetValue: null, current: 12000, maxDelta: 37000.0 },
  { metric: 'Theta', targetMin: null, targetMax: null, targetValue: -5000.0, current: -6200, maxDelta: 1200.0 },
  { metric: 'Nominal Exposure', targetMin: 0.0, targetMax: 1000000.0, targetValue: null, current: 435000, maxDelta: 565000.0 },
]

interface SuggestedTrade {
  id: string
  trade: 'SELL' | 'BUY'
  contract: string
  size: number
  price: number
  value: number
  market: 'Deribit' | 'Kalshi' | 'Polymarket'
  approved: boolean
}

const suggestedTrades: SuggestedTrade[] = [
  { id: '1', trade: 'SELL', contract: 'BTC Perpetual', size: -4, price: 50000, value: -200000, market: 'Deribit', approved: true },
  { id: '2', trade: 'BUY', contract: 'BTC PUT Option (ATM)', size: 10, price: 1500, value: 15000, market: 'Deribit', approved: true },
  { id: '3', trade: 'SELL', contract: 'BTC CALL Option (OTM)', size: 5, price: 1800, value: 9000, market: 'Deribit', approved: true },
  { id: '4', trade: 'BUY', contract: 'BTC PUT Option (Deep OTM)', size: 20, price: 500, value: 10000, market: 'Deribit', approved: true },
  { id: '5', trade: 'SELL', contract: 'BTC Futures (30D)', size: -2, price: 50500, value: -101000, market: 'Deribit', approved: true },
]

// Mock data for charts
const generateChartData = (metric: string) => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    real: Math.random() * 1000 - 500,
    target: 0,
  }))
}

export default function BookkeeperPage() {
  const queryClient = useQueryClient()
  const [selectedOptimizer, setSelectedOptimizer] = useState('Optimizer 01')
  const [rebalancingFrequency, setRebalancingFrequency] = useState('Time-Frequency')
  const [targetDriftFrequency, setTargetDriftFrequency] = useState('0')
  const [selectAutomatically, setSelectAutomatically] = useState(true)
  const [approveAutomatically, setApproveAutomatically] = useState(true)
  const [slippageBudget, setSlippageBudget] = useState([0])
  const [currentTags, setCurrentTags] = useState(['Kalshi', 'Polymarket', 'Deribit', 'BTC', 'Subportfolio #1'])
  const [selectedTradableMarkets, setSelectedTradableMarkets] = useState({
    kalshi: true,
    polymarket: true,
    deribit: true,
  })

  // Fetch data
  const { data: greeksData } = useQuery({
    queryKey: ['portfolio-greeks'],
    queryFn: dataLibraryAPI.getPortfolioGreeks,
    refetchInterval: 30000,
  })

  const { data: rebalancingSuggestions } = useQuery({
    queryKey: ['rebalancing-suggestions'],
    queryFn: dataLibraryAPI.getRebalancingSuggestions,
    refetchInterval: 60000,
  })

  // Execute rebalancing mutation
  const executeRebalancingMutation = useMutation({
    mutationFn: (trades: any) => dataLibraryAPI.executeRebalancing(trades),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-greeks'] })
      queryClient.invalidateQueries({ queryKey: ['rebalancing-suggestions'] })
    },
  })

  const handleExecuteRebalancing = () => {
    const approvedTrades = suggestedTrades
      .filter(trade => trade.approved)
      .map(trade => ({
        action: trade.trade.toLowerCase(),
        asset: trade.contract,
        size: Math.abs(trade.size),
        order_type: 'market',
        price: trade.price,
      }))

    executeRebalancingMutation.mutate({ trades: approvedTrades })
  }

  const formatValue = (value: number | null) => {
    if (value === null) return '-'
    return value.toLocaleString()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-light">Modules</h1>
            <Tabs defaultValue="bookkeeper" className="w-auto">
              <TabsList className="bg-gray-900">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="implied-volatility">Implied Volatility</TabsTrigger>
                <TabsTrigger value="bookkeeper">Bookkeeper</TabsTrigger>
                <TabsTrigger value="contract-screener">Contract Screener</TabsTrigger>
                <TabsTrigger value="risk-local">Risk (Local)</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Module
            </Button>
          </div>
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

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Greeks Limits */}
          <div className="col-span-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">Optimizer</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-xs">MATRIC</TableHead>
                      <TableHead className="text-xs">TARGET MIN</TableHead>
                      <TableHead className="text-xs">TARGET MAX</TableHead>
                      <TableHead className="text-xs">TARGET VALUE</TableHead>
                      <TableHead className="text-xs">CURRENT</TableHead>
                      <TableHead className="text-xs">MAX DELTA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {greeksLimits.map((limit) => (
                      <TableRow key={limit.metric} className="border-gray-800">
                        <TableCell className="text-sm">{limit.metric}</TableCell>
                        <TableCell className="text-sm">{formatValue(limit.targetMin)}</TableCell>
                        <TableCell className="text-sm">{formatValue(limit.targetMax)}</TableCell>
                        <TableCell className="text-sm">{formatValue(limit.targetValue)}</TableCell>
                        <TableCell className="text-sm font-medium">{formatValue(limit.current)}</TableCell>
                        <TableCell className="text-sm">{formatValue(limit.maxDelta)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Suggested Trades */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">Suggested Trades</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead className="text-xs">TRADE</TableHead>
                        <TableHead className="text-xs">CONTRACT</TableHead>
                        <TableHead className="text-xs">SIZE</TableHead>
                        <TableHead className="text-xs">PRICE</TableHead>
                        <TableHead className="text-xs">VALUE</TableHead>
                        <TableHead className="text-xs">MARKET</TableHead>
                        <TableHead className="text-xs">APPROVE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestedTrades.map((trade) => (
                        <TableRow key={trade.id} className="border-gray-800">
                          <TableCell>
                            <Badge 
                              variant={trade.trade === 'BUY' ? 'default' : 'destructive'}
                              className={trade.trade === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}
                            >
                              {trade.trade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{trade.contract}</TableCell>
                          <TableCell className="text-sm">{trade.size}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(trade.price)}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(trade.value)}</TableCell>
                          <TableCell className="text-sm">{trade.market}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Settings */}
          <div className="col-span-4">
            <div className="space-y-6">
              {/* Select Optimizer */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-normal">Select Optimizer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="optimizer" 
                      value="Optimizer 01"
                      checked={selectedOptimizer === 'Optimizer 01'}
                      onChange={(e) => setSelectedOptimizer(e.target.value)}
                      className="text-blue-600" 
                    />
                    <span className="text-sm">Optimizer 01</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="optimizer" 
                      value="Optimizer 02"
                      checked={selectedOptimizer === 'Optimizer 02'}
                      onChange={(e) => setSelectedOptimizer(e.target.value)}
                      className="text-blue-600" 
                    />
                    <span className="text-sm">Optimizer 02</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="optimizer" 
                      value="Optimizer 03"
                      checked={selectedOptimizer === 'Optimizer 03'}
                      onChange={(e) => setSelectedOptimizer(e.target.value)}
                      className="text-blue-600" 
                    />
                    <span className="text-sm">Optimizer 03</span>
                  </label>
                </CardContent>
              </Card>

              {/* Rebalancing Frequency */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-normal">Rebalancing Frequency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={rebalancingFrequency} onValueChange={setRebalancingFrequency}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Time-Frequency">Time-Frequency</SelectItem>
                      <SelectItem value="Event-Based">Event-Based</SelectItem>
                      <SelectItem value="Manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Target-drift Frequency</Label>
                    <Select value={targetDriftFrequency} onValueChange={setTargetDriftFrequency}>
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-auto"
                      checked={selectAutomatically}
                      onCheckedChange={(checked) => setSelectAutomatically(checked as boolean)}
                    />
                    <label 
                      htmlFor="select-auto" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Select Automatically
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Tag Management */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-normal">Tag Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    placeholder="Enter tags"
                    className="bg-gray-800 border-gray-700"
                  />
                  
                  <div>
                    <Label className="text-sm mb-2">Current Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tradable Markets */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-normal">Tradable Markets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="kalshi"
                      checked={selectedTradableMarkets.kalshi}
                      onCheckedChange={(checked) => setSelectedTradableMarkets(prev => ({ ...prev, kalshi: checked as boolean }))}
                    />
                    <label htmlFor="kalshi" className="text-sm">Kalshi</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="polymarket"
                      checked={selectedTradableMarkets.polymarket}
                      onCheckedChange={(checked) => setSelectedTradableMarkets(prev => ({ ...prev, polymarket: checked as boolean }))}
                    />
                    <label htmlFor="polymarket" className="text-sm">Polymarket</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="deribit"
                      checked={selectedTradableMarkets.deribit}
                      onCheckedChange={(checked) => setSelectedTradableMarkets(prev => ({ ...prev, deribit: checked as boolean }))}
                    />
                    <label htmlFor="deribit" className="text-sm">Deribit</label>
                  </div>
                </CardContent>
              </Card>

              {/* Slippage Budget */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-normal">Slippage Budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Amount</Label>
                      <span className="text-sm font-medium">{slippageBudget[0]}</span>
                    </div>
                    <Slider
                      value={slippageBudget}
                      onValueChange={setSlippageBudget}
                      max={10000}
                      step={100}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="approve-auto"
                      checked={approveAutomatically}
                      onCheckedChange={(checked) => setApproveAutomatically(checked as boolean)}
                    />
                    <label 
                      htmlFor="approve-auto" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Automatically Approve Trades
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Charts */}
          <div className="col-span-4 space-y-6">
            {/* Visual Comparison Charts */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">Visual Comparison Real vs Target over Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Delta', 'Gamma', 'Vega'].map((metric) => (
                  <div key={metric}>
                    <h4 className="text-sm font-medium mb-2">{metric}</h4>
                    <div className="h-[80px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generateChartData(metric)}>
                          <XAxis dataKey="time" hide />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="real" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={false}
                            name="Real"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="target" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray="5 5"
                            name="Target"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Rebalancing Logs */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base font-normal">Rebalancing Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Manual Override by User</h4>
                    <div className="text-sm text-gray-400">
                      <div>Δ Delta: <span className="text-white">-$8,000</span> • Δ Vega: <span className="text-white">-$1,200</span> • Δ Theta: <span className="text-white">+$400</span></div>
                      <div className="mt-1">Trades: Sold 4 BTC-50000-07-25 on Deribit</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Scheduled Rebalance (Time-based interval)</h4>
                    <div className="text-sm text-gray-400">
                      {/* Additional log entries would go here */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Choose another optimizer
              </Button>
              <Button variant="outline" className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                Highlight trades over $100k notional
              </Button>
              <Button variant="outline" className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                Increase slippage tolerance to 0.5%
              </Button>
              <Button variant="outline" className="flex-1">
                <Clock className="w-4 h-4 mr-2" />
                Show rebalancing log for last 7 days
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}