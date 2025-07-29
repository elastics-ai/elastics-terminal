'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function DashboardPage() {
  // Mock data matching the design
  const performanceData = [
    { date: 'Apr 2024', cumulative: 0, benchmark: 0 },
    { date: 'May 2024', cumulative: 5, benchmark: 2 },
    { date: 'Jun 2024', cumulative: 12, benchmark: 8 },
    { date: 'Jul 2024', cumulative: 18, benchmark: 10 },
    { date: 'Aug 2024', cumulative: 25, benchmark: 15 },
    { date: 'Sep 2024', cumulative: 32, benchmark: 18 },
  ]

  const alphaData = [
    { date: 'Apr 2024', alpha: 0, beta: 0 },
    { date: 'May 2024', alpha: 0.1, beta: 0.05 },
    { date: 'Jun 2024', alpha: 0.2, beta: 0.15 },
    { date: 'Jul 2024', alpha: 0.3, beta: 0.2 },
    { date: 'Aug 2024', alpha: 0.4, beta: 0.25 },
    { date: 'Sep 2024', alpha: 0.5, beta: 0.3 },
  ]

  const exposureData = [
    { name: 'Crypto', value: 20, color: '#3b82f6' },
    { name: 'Equities', value: 25, color: '#8b5cf6' },
    { name: 'Fixed Income', value: 15, color: '#10b981' },
    { name: 'Alternatives', value: 20, color: '#f59e0b' },
    { name: 'Cash', value: 10, color: '#6b7280' },
    { name: 'Commodities', value: 10, color: '#ef4444' },
  ]

  const newsItems = [
    {
      category: 'Economic Data',
      title: 'GDP Growth (Q2Q)',
      value: '2.8%',
      change: '+0.3%',
      status: 'neutral'
    },
    {
      category: 'Market',
      title: 'S&P 500 Close',
      value: '4,890',
      change: '+1.2%',
      status: 'positive'
    },
    {
      category: 'Volatility',
      title: 'VIX Manufacturing Index',
      value: '50.1',
      change: '-2.1%',
      status: 'negative'
    },
    {
      category: 'Crypto',
      title: 'BTC/USD',
      value: '$67,450',
      change: '+3.2%',
      status: 'positive'
    }
  ]

  return (
    <AppLayout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Portfolio Overview Header */}
        <div className="mb-6">
          <h1 className="text-xl font-normal text-gray-900 mb-6">Portfolio Overview</h1>
          
          {/* Portfolio Metrics Cards */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Portfolio Value</div>
              <div className="text-2xl font-semibold text-gray-900">$2,540,300</div>
              <div className="text-sm text-green-600">+$1,624,180</div>
              <div className="text-xs text-green-600">+11.6% Month</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative P&L</div>
              <div className="text-2xl font-semibold text-green-600">+60%</div>
              <div className="text-xs text-green-600">+12% Month</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative Return</div>
              <div className="text-2xl font-semibold text-green-600">+44%</div>
              <div className="text-xs text-green-600">+12% Month</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Return</div>
              <div className="text-2xl font-semibold text-red-600">-26%</div>
              <div className="text-xs text-red-600">-4% GDO</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Max Drawdown</div>
              <div className="text-2xl font-semibold text-gray-900">38%</div>
              <div className="text-xs text-gray-500">-6% Month</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Volatility</div>
              <div className="text-2xl font-semibold text-gray-900">38%</div>
              <div className="text-xs text-gray-500">+2% Month</div>
            </Card>
          </div>

          {/* Greek Metrics */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Alpha</div>
              <div className="text-2xl font-semibold text-gray-900">0.15</div>
              <div className="text-xs text-green-600">+0.1 8.90%</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Beta</div>
              <div className="text-2xl font-semibold text-gray-900">0.46</div>
              <div className="text-xs text-blue-600">+0.2 20%</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">CVaR 95%</div>
              <div className="text-2xl font-semibold text-gray-900">$152,492</div>
              <div className="text-xs text-red-600">-$4 -8.80%</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Sharpe Ratio</div>
              <div className="text-2xl font-semibold text-gray-900">2.46</div>
              <div className="text-xs text-green-600">+0.4 +6.55%</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Calmar Ratio</div>
              <div className="text-2xl font-semibold text-gray-900">0.54</div>
              <div className="text-xs text-red-600">-2.4 -5.56%</div>
            </Card>
          </div>
        </div>

        {/* Charts and Analytics Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Performance Breakdown Chart */}
          <Card className="col-span-8 p-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-normal">Performance Breakdown</CardTitle>
                <div className="flex gap-2 text-sm">
                  <span className="px-2 py-1 bg-black text-white rounded text-xs">1Y</span>
                  <span className="px-2 py-1 text-gray-500">YTD</span>
                  <span className="px-2 py-1 text-gray-500">6M</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="benchmark" 
                      stroke="#6b7280" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">Cumulative Returns</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Portfolio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Benchmark</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Exposure */}
          <Card className="col-span-4 p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal">Portfolio Exposure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exposureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {exposureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {exposureData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alpha/Beta Chart */}
          <Card className="col-span-8 p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-normal">Alpha/Beta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={alphaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Line 
                      type="monotone" 
                      dataKey="alpha" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="beta" 
                      stroke="#6b7280" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Alpha</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm">Beta</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* News Feed */}
          <Card className="col-span-4 p-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-normal">News Feed</CardTitle>
                <button className="text-sm text-blue-600 hover:underline">See All</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {newsItems.map((item, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">{item.category}</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{item.title}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{item.value}</span>
                          <span className={`text-xs ${
                            item.status === 'positive' ? 'text-green-600' : 
                            item.status === 'negative' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {item.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}