'use client'

import React, { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  Settings,
  AlertCircle,
  Plus
} from 'lucide-react'
import { Line, Bar, Pie, LineChart, BarChart, PieChart as RePieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

export default function PortfolioPage() {
  const [timeframe, setTimeframe] = useState('1M')
  
  // Mock portfolio data
  const portfolioStats = {
    totalValue: 2547890,
    dailyPnL: 12340,
    dailyPnLPercent: 0.48,
    totalPnL: 347890,
    totalPnLPercent: 15.8,
    sharpeRatio: 1.85,
    maxDrawdown: -8.5,
    volatility: 18.3,
    beta: 0.92
  }
  
  // Mock performance data
  const performanceData = [
    { date: '2024-01-01', value: 2200000, pnl: 0 },
    { date: '2024-01-05', value: 2280000, pnl: 80000 },
    { date: '2024-01-10', value: 2350000, pnl: 150000 },
    { date: '2024-01-15', value: 2420000, pnl: 220000 },
    { date: '2024-01-20', value: 2480000, pnl: 280000 },
    { date: '2024-01-25', value: 2547890, pnl: 347890 },
  ]
  
  // Mock position data
  const positions = [
    { symbol: 'SPX 4500C 03/15', type: 'Call', quantity: 50, avgPrice: 45.50, currentPrice: 52.30, pnl: 340.00, pnlPercent: 14.95 },
    { symbol: 'SPX 4400P 03/15', type: 'Put', quantity: -30, avgPrice: 38.20, currentPrice: 35.10, pnl: 93.00, pnlPercent: 8.12 },
    { symbol: 'QQQ 380C 02/28', type: 'Call', quantity: 100, avgPrice: 12.75, currentPrice: 14.20, pnl: 145.00, pnlPercent: 11.37 },
    { symbol: 'IWM 200P 03/01', type: 'Put', quantity: 75, avgPrice: 8.90, currentPrice: 7.45, pnl: -108.75, pnlPercent: -16.29 },
    { symbol: 'VIX 25C 02/21', type: 'Call', quantity: 200, avgPrice: 2.15, currentPrice: 2.85, pnl: 140.00, pnlPercent: 32.56 },
  ]
  
  // Mock allocation data
  const allocationData = [
    { name: 'Calls', value: 45, color: '#10b981' },
    { name: 'Puts', value: 30, color: '#ef4444' },
    { name: 'Spreads', value: 15, color: '#3b82f6' },
    { name: 'Cash', value: 10, color: '#6b7280' },
  ]
  
  // Mock Greeks exposure
  const greeksData = [
    { greek: 'Delta', value: 0.25, target: 0.20, color: '#3b82f6' },
    { greek: 'Gamma', value: 0.05, target: 0.05, color: '#10b981' },
    { greek: 'Vega', value: 15.2, target: 10.0, color: '#f59e0b' },
    { greek: 'Theta', value: -8.5, target: -10.0, color: '#ef4444' },
    { greek: 'Rho', value: 12.3, target: 15.0, color: '#8b5cf6' },
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal mb-1">Portfolio Analysis</h1>
            <p className="text-gray-500">Comprehensive portfolio performance and risk metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1D">1 Day</SelectItem>
                <SelectItem value="1W">1 Week</SelectItem>
                <SelectItem value="1M">1 Month</SelectItem>
                <SelectItem value="3M">3 Months</SelectItem>
                <SelectItem value="1Y">1 Year</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Value</span>
              <DollarSign className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">${portfolioStats.totalValue.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${portfolioStats.totalPnL > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {portfolioStats.totalPnL > 0 ? '+' : ''}{portfolioStats.totalPnLPercent}%
              </span>
              <span className="text-xs text-gray-500">all time</span>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Daily P&L</span>
              {portfolioStats.dailyPnL > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className={`text-2xl font-medium ${portfolioStats.dailyPnL > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioStats.dailyPnL > 0 ? '+' : ''}${Math.abs(portfolioStats.dailyPnL).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {portfolioStats.dailyPnLPercent > 0 ? '+' : ''}{portfolioStats.dailyPnLPercent}%
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sharpe Ratio</span>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">{portfolioStats.sharpeRatio}</div>
            <Badge variant={portfolioStats.sharpeRatio > 1.5 ? 'default' : 'secondary'} className="mt-1 text-xs">
              {portfolioStats.sharpeRatio > 1.5 ? 'Good' : 'Average'}
            </Badge>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Max Drawdown</span>
              <AlertCircle className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium text-red-500">{portfolioStats.maxDrawdown}%</div>
            <div className="text-sm text-gray-500 mt-1">
              Volatility: {portfolioStats.volatility}%
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="greeks">Greeks</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Portfolio Value Over Time</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Daily P&L Distribution</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="pnl" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Risk Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">Beta</span>
                    <span className="font-medium">{portfolioStats.beta}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">Volatility (Annual)</span>
                    <span className="font-medium">{portfolioStats.volatility}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">Sharpe Ratio</span>
                    <span className="font-medium">{portfolioStats.sharpeRatio}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-500">Max Drawdown</span>
                    <span className="font-medium text-red-500">{portfolioStats.maxDrawdown}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Win Rate</span>
                    <span className="font-medium">68.4%</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Open Positions</h3>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Avg Price</th>
                      <th className="text-right py-2">Current Price</th>
                      <th className="text-right py-2">P&L</th>
                      <th className="text-right py-2">P&L %</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-900/50">
                        <td className="py-3 font-medium">{position.symbol}</td>
                        <td className="py-3">
                          <Badge variant={position.type === 'Call' ? 'default' : 'destructive'}>
                            {position.type}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">{position.quantity}</td>
                        <td className="py-3 text-right">${position.avgPrice.toFixed(2)}</td>
                        <td className="py-3 text-right">${position.currentPrice.toFixed(2)}</td>
                        <td className={`py-3 text-right ${position.pnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.pnl > 0 ? '+' : ''}${position.pnl.toFixed(2)}
                        </td>
                        <td className={`py-3 text-right ${position.pnlPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.pnlPercent > 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="ghost">
                            Close
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Portfolio Allocation</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Allocation Details</h3>
                <div className="space-y-3">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="greeks" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Greeks Exposure</h3>
              <div className="space-y-4">
                {greeksData.map((greek) => (
                  <div key={greek.greek} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{greek.greek}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">Target: {greek.target}</span>
                        <span className="font-medium">{greek.value}</span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-800 rounded">
                      <div
                        className="absolute h-full rounded transition-all"
                        style={{
                          width: `${Math.min((Math.abs(greek.value) / Math.max(Math.abs(greek.value), Math.abs(greek.target))) * 100, 100)}%`,
                          backgroundColor: greek.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Risk Analysis</h3>
              <p className="text-gray-500">Advanced risk metrics and scenario analysis</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}