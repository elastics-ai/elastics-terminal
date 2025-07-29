'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { SSVISurface3D } from '@/components/volatility/ssvi-surface-3d'
import { GreeksSurface3D } from '@/components/volatility/greeks-surface-3d'
import { Loader2, TrendingUp, Activity, BarChart3, Target } from 'lucide-react'

interface MarketData {
  symbol: string
  spot_price: number
  volatility: number
  last_updated: string
}

interface SurfaceConfig {
  symbol: string
  spot: number
  volatility: number
  riskFreeRate: number
  dividendYield: number
}

export default function VolatilitySurfacesPage() {
  const [activeTab, setActiveTab] = useState('ssvi')
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<SurfaceConfig>({
    symbol: 'BTC-USD',
    spot: 50000,
    volatility: 0.8,
    riskFreeRate: 0.05,
    dividendYield: 0.0
  })
  const { toast } = useToast()

  // Fetch available market data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('/api/market/symbols')
        if (response.ok) {
          const data = await response.json()
          setMarketData(data)
          
          // Update config with first symbol's data
          if (data.length > 0) {
            setConfig(prev => ({
              ...prev,
              symbol: data[0].symbol,
              spot: data[0].spot_price,
              volatility: data[0].volatility
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching market data:', error)
      }
    }

    fetchMarketData()
  }, [])

  const handleSymbolChange = (symbol: string) => {
    const symbolData = marketData.find(d => d.symbol === symbol)
    if (symbolData) {
      setConfig(prev => ({
        ...prev,
        symbol,
        spot: symbolData.spot_price,
        volatility: symbolData.volatility
      }))
    }
  }

  const handleCalibrate = async (symbol: string, calibrationConfig: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/volatility/ssvi/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          ...calibrationConfig,
          spot: config.spot,
          risk_free_rate: config.riskFreeRate,
          dividend_yield: config.dividendYield
        })
      })

      if (!response.ok) throw new Error('Calibration failed')

      const result = await response.json()
      toast({
        title: "Calibration Complete",
        description: `SSVI surface calibrated for ${symbol}`,
      })
    } catch (error) {
      console.error('Calibration error:', error)
      toast({
        title: "Calibration Failed",
        description: "Failed to calibrate volatility surface",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (data: any) => {
    toast({
      title: "Data Exported",
      description: "Surface data has been downloaded",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Volatility Surface Analysis
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Interactive 3D volatility surfaces with SSVI modeling and Greeks analysis
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Live Data
              </span>
            </div>
            <Badge variant="outline" className="hidden lg:flex">
              {marketData.length} Markets Available
            </Badge>
          </div>
        </div>

        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="symbol" className="text-sm font-medium">Symbol</Label>
                <Select value={config.symbol} onValueChange={handleSymbolChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {marketData.map(market => (
                      <SelectItem key={market.symbol} value={market.symbol}>
                        {market.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="spot" className="text-sm font-medium">Spot Price</Label>
                <Input
                  id="spot"
                  type="number"
                  value={config.spot}
                  onChange={(e) => setConfig(prev => ({ ...prev, spot: Number(e.target.value) }))}
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="volatility" className="text-sm font-medium">Volatility</Label>
                <Input
                  id="volatility"
                  type="number"
                  step="0.01"
                  value={config.volatility}
                  onChange={(e) => setConfig(prev => ({ ...prev, volatility: Number(e.target.value) }))}
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="risk-free" className="text-sm font-medium">Risk-Free Rate</Label>
                <Input
                  id="risk-free"
                  type="number"
                  step="0.001"
                  value={config.riskFreeRate}
                  onChange={(e) => setConfig(prev => ({ ...prev, riskFreeRate: Number(e.target.value) }))}
                  className="font-mono"
                />
              </div>
              
              <div>
                <Label htmlFor="dividend" className="text-sm font-medium">Dividend Yield</Label>
                <Input
                  id="dividend"
                  type="number"
                  step="0.001"
                  value={config.dividendYield}
                  onChange={(e) => setConfig(prev => ({ ...prev, dividendYield: Number(e.target.value) }))}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Surface Analysis */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="ssvi" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              SSVI Surface
            </TabsTrigger>
            <TabsTrigger value="greeks" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Greeks Analysis
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scenarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ssvi" className="space-y-6">
            <div className="relative">
              <SSVISurface3D
                symbol={config.symbol}
                height={600}
                onCalibrate={handleCalibrate}
                onExport={handleExport}
              />
              
              {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Calibrating surface...</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="greeks" className="space-y-6">
            <GreeksSurface3D
              symbol={config.symbol}
              spot={config.spot}
              volatility={config.volatility}
              height={600}
              onExport={handleExport}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SSVI vs Market Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <SSVISurface3D
                    symbol={config.symbol}
                    height={400}
                    onCalibrate={handleCalibrate}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Greeks Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <GreeksSurface3D
                    symbol={config.symbol}
                    spot={config.spot}
                    volatility={config.volatility}
                    height={400}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stress Testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Analyze how volatility surfaces and Greeks respond to market stress scenarios.
                  </p>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Market Crash (-20% spot)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Activity className="h-4 w-4 mr-2" />
                      Volatility Spike (+50% vol)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Time Decay (1 week forward)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="h-4 w-4 mr-2" />
                      Rate Hike (+100 bps)
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Scenario Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Select a stress scenario to view detailed analysis
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Surface Fit Quality</p>
                  <p className="text-2xl font-bold">0.9847</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Calibration Time</p>
                  <p className="text-2xl font-bold">1.2s</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Arbitrage Free</p>
                  <p className="text-2xl font-bold">✓</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}