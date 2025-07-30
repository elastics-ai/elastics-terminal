'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar } from 'recharts'
import { Bell, TrendingUp, AlertTriangle, Info, CheckCircle, X, Wifi, WifiOff } from 'lucide-react'
import { 
  wsClient, 
  useWebSocketConnection,
  useDashboardWebSocket,
  usePortfolioAnalyticsWebSocket,
  useNewsWebSocket,
  useAIInsightsWebSocket 
} from '@/lib/websocket'

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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

  // WebSocket connection status
  const isConnected = useWebSocketConnection()

  // Initialize WebSocket connection
  useEffect(() => {
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [])

  // Handle real-time dashboard updates via WebSocket
  const handleWebSocketUpdate = useCallback((eventType: string, data: any) => {
    console.log(`[Dashboard] WebSocket update: ${eventType}`, data)
    setLastUpdateTime(new Date())
    
    setDashboardData(prev => {
      if (!prev) return prev

      switch (eventType) {
        case 'portfolio_update':
          return {
            ...prev,
            portfolio_summary: data.portfolio_summary || prev.portfolio_summary,
            asset_allocation: data.asset_allocation || prev.asset_allocation,
            strategy_allocation: data.strategy_allocation || prev.strategy_allocation
          }
        case 'portfolio_analytics':
          return {
            ...prev,
            portfolio_analytics: data.update_type === 'incremental' 
              ? { ...prev.portfolio_analytics, ...data }
              : data
          }
        case 'performance_update':
          return {
            ...prev,
            performance_history: data.performance_history || prev.performance_history,
            market_indicators: data.market_indicators || prev.market_indicators
          }
        case 'news_update':
          return {
            ...prev,
            news_feed: data.news_feed || prev.news_feed
          }
        case 'ai_insight':
          // Merge new insights with existing ones
          const existingInsights = prev.ai_insights || []
          const newInsights = data.insights || []
          const updatedInsights = [...existingInsights]
          
          // Update or add new insights
          newInsights.forEach((newInsight: any) => {
            const existingIndex = updatedInsights.findIndex(insight => insight.id === newInsight.id)
            if (existingIndex >= 0) {
              updatedInsights[existingIndex] = newInsight
            } else {
              updatedInsights.unshift(newInsight) // Add to front
            }
          })
          
          return {
            ...prev,
            ai_insights: updatedInsights.slice(0, 10) // Keep only latest 10
          }
        default:
          return prev
      }
    })
  }, [])

  // Subscribe to WebSocket updates
  useDashboardWebSocket(handleWebSocketUpdate)

  // Initial data fetch
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
        setLastUpdateTime(new Date())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching dashboard data:', err)
        // Fall back to mock data
        setDashboardData(getMockDashboardData())
        setLastUpdateTime(new Date())
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
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
        <div className="p-6 bg-background min-h-screen flex items-center justify-center">
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
        <div className="p-6 bg-background min-h-screen flex items-center justify-center">
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

  // Transform performance history for alpha/beta chart
  const alphaData = performance_history.slice(-30).map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    alpha: portfolio_analytics.alpha,
    beta: portfolio_analytics.beta
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
        sharpe_ratio: 0.51,
        sortino_ratio: 0.72,
        calmar_ratio: 1.51,
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
      <div className="p-6 bg-background min-h-screen">
        {/* Portfolio Overview Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-normal text-foreground">Portfolio Overview</h1>
            
            {/* Real-time Status Indicator */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {lastUpdateTime && (
                <div className="text-gray-500">
                  Last update: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          {/* Portfolio Metrics Cards - Row 1 */}
          <div className="grid grid-cols-7 gap-3 mb-4">
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Portfolio Value</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                ${portfolio_analytics.portfolio_value?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-500">Total Value</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative P&L</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className={`text-xl font-semibold ${
                (portfolio_analytics.cumulative_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.cumulative_pnl || 0) >= 0 ? '+' : ''}
                ${portfolio_analytics.cumulative_pnl?.toLocaleString() || '0'}
              </div>
              <div className="text-xs text-gray-500">Total P&L</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Cumulative Return</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className={`text-xl font-semibold ${
                (portfolio_analytics.cumulative_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.cumulative_return || 0) >= 0 ? '+' : ''}
                {portfolio_analytics.cumulative_return?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Total Return</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Return</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className={`text-xl font-semibold ${
                (portfolio_analytics.annual_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(portfolio_analytics.annual_return || 0) >= 0 ? '+' : ''}
                {portfolio_analytics.annual_return?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Annualized</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Max Drawdown</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-red-600">
                -{Math.abs(portfolio_analytics.max_drawdown || 0).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Peak to Trough</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Annual Volatility</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.annual_volatility?.toFixed(1) || '0'}%
              </div>
              <div className="text-xs text-gray-500">Annualized Vol</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Net Delta</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.net_delta?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Delta Exposure</div>
            </Card>
          </div>

          {/* Portfolio Metrics Cards - Row 2 */}
          <div className="grid grid-cols-7 gap-3 mb-8">
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">VaR 95%</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-red-600">
                ${Math.abs(portfolio_analytics.var_95 || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Value at Risk</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">CVaR 95%</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-red-600">
                ${Math.abs(portfolio_analytics.cvar_95 || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Tail Risk</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Alpha</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.alpha?.toFixed(3) || '0.000'}
              </div>
              <div className="text-xs text-gray-500">Excess Return</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Beta</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.beta?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Market Beta</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Sharpe Ratio</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.sharpe_ratio?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Risk-Adjusted</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Sortino Ratio</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.sortino_ratio?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Downside Risk</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-gray-500 mb-1">Calmar Ratio</div>
              <div className="border-t border-gray-600 my-2"></div>
              <div className="text-xl font-semibold text-gray-900">
                {portfolio_analytics.calmar_ratio?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-gray-500">Return/Drawdown</div>
            </Card>
          </div>

          {/* AI Insights Section */}
          {ai_insights && ai_insights.length > 0 && (
            <Card className="mb-8 p-6">
              <CardHeader className="px-6 pt-6 pb-4">
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
              <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                  {ai_insights.slice(0, 4).map((insight) => (
                    <div 
                      key={insight.id}
                      className={`p-4 rounded-lg border ${
                        insight.acknowledged ? 'bg-background border-gray-200' : 'bg-white border-blue-200'
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
        <div className="grid grid-cols-12 gap-0">
          {/* Combined Performance and Alpha/Beta Chart */}
          <Card className="col-span-6 rounded-none border border-gray-300">
            <CardHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-normal">Performance & Alpha/Beta</CardTitle>
                <div className="flex gap-2 text-sm">
                  <span className="px-2 py-1 bg-black text-white rounded text-xs">1Y</span>
                  <span className="px-2 py-1 text-gray-500">YTD</span>
                  <span className="px-2 py-1 text-gray-500">6M</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-6">
                {/* Performance Chart */}
                <div>
                  <div className="text-sm text-gray-500 mb-2">Performance Breakdown</div>
                  <div className="h-48">
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
                  <div className="flex items-center gap-4 mt-2">
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
                
                {/* Divider */}
                <div className="border-t border-gray-200"></div>
                
                {/* Alpha/Beta Chart */}
                <div>
                  <div className="text-sm text-gray-500 mb-2">Alpha/Beta</div>
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
                  <div className="flex items-center gap-4 mt-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Exposure and Instrument Types */}
          <Card className="col-span-3 rounded-none border-y border-r border-gray-300">
            <CardHeader className="px-6 pt-6 pb-4">
              <CardTitle className="text-lg font-normal">Portfolio Exposure</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="space-y-6">
                {/* Portfolio Exposure Pie Chart */}
                <div>
                  <div className="h-52 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={exposureData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={80}
                          paddingAngle={0}
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
                </div>
                
                {/* Divider */}
                <div className="border-t border-gray-200"></div>
                
                {/* Instrument Types Bar Chart */}
                <div>
                  <div className="text-sm text-gray-500 mb-2">Instrument Types</div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { type: 'Options', value: 45 },
                        { type: 'Futures', value: 35 },
                        { type: 'Spot', value: 20 }
                      ]}>
                        <XAxis dataKey="type" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications and News Feed */}
          <div className="col-span-3 space-y-0">
            {/* Notifications */}
            <Card className="rounded-none border-t border-r border-gray-300">
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-normal flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    3 New
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Strategy Performance Alert</div>
                        <div className="text-xs text-gray-600 mt-1">Your Alpha Strategy exceeded 15% returns this month</div>
                        <div className="text-xs text-gray-400 mt-1">2 minutes ago</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Market Update</div>
                        <div className="text-xs text-gray-600 mt-1">BTC volatility increased by 12% in the last hour</div>
                        <div className="text-xs text-gray-400 mt-1">1 hour ago</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Risk Alert</div>
                        <div className="text-xs text-gray-600 mt-1">Portfolio delta exposure approaching threshold</div>
                        <div className="text-xs text-gray-400 mt-1">3 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* News Feed */}
            <Card className="rounded-none border-b border-r border-gray-300" style={{minHeight: '500px'}}>
              <CardHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-normal flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    News Feed
                  </CardTitle>
                  <button className="text-sm text-blue-600 hover:underline">See All</button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
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
      </div>
    </AppLayout>
  )
}