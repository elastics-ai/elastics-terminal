'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Bell, TrendingUp, AlertTriangle, Info, CheckCircle, X } from 'lucide-react'

interface DashboardData {
  portfolio_summary: any
  portfolio_analytics: any
  performance_history: any[]
  news_feed: any[]
  ai_insights: any[]
  asset_allocation: Record<string, number>
  strategy_allocation: Record<string, number>
  market_indicators: Record<string, number>
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/overview')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching dashboard data:', err)
        // Fall back to mock data
        setDashboardData(getMockDashboardData())
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Acknowledge AI insight
  const acknowledgeInsight = async (insightId: string) => {
    try {
      await fetch(`/api/dashboard/insights/${insightId}/acknowledge`, { method: 'POST' })
      // Update local state
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          ai_insights: dashboardData.ai_insights.map(insight =>
            insight.id === insightId ? { ...insight, acknowledged: true } : insight
          )
        })
      }
    } catch (err) {
      console.error('Error acknowledging insight:', err)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error && !dashboardData) {
    return (
      <AppLayout>
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!dashboardData) return null

  const { portfolio_analytics, performance_history, news_feed, ai_insights, asset_allocation } = dashboardData

  // Transform asset allocation for pie chart
  const exposureData = Object.entries(asset_allocation).map(([name, value], index) => ({
    name,
    value: Math.round(value),
    color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#6b7280', '#ef4444'][index % 6]
  }))

  // Transform performance history for chart
  const performanceData = performance_history.slice(-30).map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cumulative: point.cumulative_return,
    daily: point.daily_return,
    portfolio_value: point.portfolio_value
  }))

  function getMockDashboardData(): DashboardData {
    return {
      portfolio_summary: {
        total_positions: 4,
        total_value: 174500,
        total_pnl: 9650,
        total_pnl_percentage: 5.86,
        net_delta: 2.55,
        absolute_delta: 4.9,
        gamma: 0.003,
        vega: 19.5,
        theta: -4.8
      },
      portfolio_analytics: {
        portfolio_value: 174500,
        cumulative_pnl: 9650,
        cumulative_return: 5.86,
        annual_return: 12.4,
        max_drawdown: -8.2,
        annual_volatility: 24.5,
        active_strategies: 1,
        var_95: 8750,
        cvar_95: 12300,
        beta: 0.85,
        alpha: 0.024,
        net_delta: 2.55,
        net_gamma: 0.003,
        net_vega: 19.5,
        net_theta: -4.8
      },
      performance_history: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        portfolio_value: 165000 + Math.random() * 20000,
        daily_return: (Math.random() - 0.5) * 4,
        cumulative_return: i * 0.2,
        drawdown: Math.random() * -5,
        volatility: 20 + Math.random() * 10,
        benchmark_return: i * 0.15
      })),
      news_feed: [],
      ai_insights: [],
      asset_allocation: {
        'BTC': 45.2,
        'ETH': 32.1,
        'Options': 15.7,
        'Cash': 7.0
      },
      strategy_allocation: {
        'Strategy-Alpha-01': 60.0,
        'Direct Positions': 40.0
      },
      market_indicators: {
        vix: 18.5,
        btc_iv: 75.2
      }
    }
  }

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
              <div className="text-2xl font-semibold text-gray-900">
                ${portfolio_analytics.portfolio_value?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-green-600">
                +${portfolio_analytics.cumulative_pnl?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-green-600">
                +{portfolio_analytics.cumulative_return?.toFixed(1) || '0'}%
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative P&L</div>
              <div className={`text-2xl font-semibold ${
                (portfolio_analytics.cumulative_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.cumulative_pnl || 0) >= 0 ? '+' : ''}
                ${portfolio_analytics.cumulative_pnl?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-500">P&L</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative Return</div>
              <div className={`text-2xl font-semibold ${
                (portfolio_analytics.cumulative_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.cumulative_return || 0) >= 0 ? '+' : ''}
                {portfolio_analytics.cumulative_return?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Total Return</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Return</div>
              <div className={`text-2xl font-semibold ${
                (portfolio_analytics.annual_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.annual_return || 0) >= 0 ? '+' : ''}
                {portfolio_analytics.annual_return?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Annualized</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Max Drawdown</div>
              <div className="text-2xl font-semibold text-red-600">
                -{Math.abs(portfolio_analytics.max_drawdown || 0).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Peak to Trough</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Volatility</div>
              <div className="text-2xl font-semibold text-gray-900">
                {portfolio_analytics.annual_volatility?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Annualized Vol</div>
            </Card>
          </div>

          {/* Risk Metrics */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Net Delta</div>
              <div className="text-2xl font-semibold text-gray-900">
                {portfolio_analytics.net_delta?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Delta Exposure</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Net Vega</div>
              <div className="text-2xl font-semibold text-gray-900">
                {portfolio_analytics.net_vega?.toFixed(1) || '0.0'}
              </div>
              <div className="text-xs text-gray-500">Vega Exposure</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">VaR 95%</div>
              <div className="text-2xl font-semibold text-red-600">
                ${Math.abs(portfolio_analytics.var_95 || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Value at Risk</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Beta</div>
              <div className="text-2xl font-semibold text-gray-900">
                {portfolio_analytics.beta?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Market Beta</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Alpha</div>
              <div className="text-2xl font-semibold text-gray-900">
                {portfolio_analytics.alpha?.toFixed(3) || '0.000'}
              </div>
              <div className="text-xs text-gray-500">Market Alpha</div>
            </Card>
          </div>

          {/* AI Insights Section */}
          {ai_insights && ai_insights.length > 0 && (
            <Card className="mb-8 p-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-normal flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    AI Suggestions
                  </CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {ai_insights.filter(i => !i.acknowledged).length} New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ai_insights.slice(0, 4).map((insight) => (
                    <div 
                      key={insight.id}
                      className={`p-4 rounded-lg border ${
                        insight.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`mt-1 ${
                            insight.priority === 'high' ? 'text-red-500' :
                            insight.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`}>
                            {insight.type === 'risk' ? <AlertTriangle className="h-4 w-4" /> :
                             insight.type === 'opportunity' ? <TrendingUp className="h-4 w-4" /> :
                             <Info className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{insight.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  insight.priority === 'high' ? 'border-red-200 text-red-700' :
                                  insight.priority === 'medium' ? 'border-yellow-200 text-yellow-700' :
                                  'border-blue-200 text-blue-700'
                                }`}
                              >
                                {insight.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                            {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                              <div className="text-xs text-gray-500">
                                <strong>Actions:</strong> {insight.suggested_actions.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        {!insight.acknowledged && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => acknowledgeInsight(insight.id)}
                            className="ml-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  News Feed
                </CardTitle>
                <button className="text-sm text-blue-600 hover:underline">See All</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {news_feed && news_feed.length > 0 ? (
                  news_feed.slice(0, 4).map((item, index) => (
                    <div key={item.id || index} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          item.is_critical ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-xs text-gray-500">{item.source}</div>
                            {item.is_critical && (
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900 mb-1">{item.title}</div>
                          <div className="text-xs text-gray-600 mb-2 line-clamp-2">{item.summary}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                            {item.relevance_score && (
                              <div className="text-xs text-gray-400">
                                Relevance: {(item.relevance_score * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No news items available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}