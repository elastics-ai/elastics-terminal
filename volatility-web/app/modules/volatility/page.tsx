'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { VolatilitySurface3D } from '@/components/modules/volatility-surface-3d'
import { AggregateGreeks, GreekHeatmap } from '@/components/modules/greeks-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Download, Settings, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export default function VolatilityModulePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'SSVI' | 'ESSVI' | 'LSTM'>('SSVI')
  const [surfaceData, setSurfaceData] = useState<any>(null)
  const [greeksData, setGreeksData] = useState<any>(null)
  const [arbitrageStatus, setArbitrageStatus] = useState<any>(null)

  // Fetch volatility surface data
  const fetchSurfaceData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/volatility/surface/display?spot=100&min_strike=80&max_strike=120')
      if (!response.ok) throw new Error('Failed to fetch surface data')
      
      const data = await response.json()
      setSurfaceData({
        strikes: data.strikes,
        expiries: data.expiries,
        surface: data.surface,
        model: data.model || selectedModel
      })

      // Check arbitrage
      const arbResponse = await fetch('/api/volatility/surface/arbitrage-check')
      if (arbResponse.ok) {
        const arbData = await arbResponse.json()
        setArbitrageStatus(arbData)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load volatility surface data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch portfolio Greeks
  const fetchGreeksData = async () => {
    try {
      const response = await fetch('/api/volatility/greeks/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          {
            spot: 100,
            strike: 105,
            time_to_expiry: 0.25,
            volatility: 0.25,
            quantity: 10,
            option_type: 'call'
          },
          {
            spot: 100,
            strike: 95,
            time_to_expiry: 0.25,
            volatility: 0.28,
            quantity: -5,
            option_type: 'put'
          }
        ])
      })

      if (!response.ok) throw new Error('Failed to fetch Greeks')
      
      const data = await response.json()
      setGreeksData(data)
    } catch (error) {
      console.error('Error fetching Greeks:', error)
    }
  }

  useEffect(() => {
    fetchSurfaceData()
    fetchGreeksData()
  }, [])

  const handleCalibrate = async () => {
    setLoading(true)
    try {
      // In a real app, this would fetch market data and calibrate
      const response = await fetch('/api/volatility/surface/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strikes: [80, 90, 100, 110, 120],
          expiries: [0.0833, 0.25, 0.5, 0.75, 1.0],
          implied_vols: [
            [0.28, 0.26, 0.25, 0.26, 0.28],
            [0.27, 0.25, 0.24, 0.25, 0.27],
            [0.26, 0.24, 0.23, 0.24, 0.26],
            [0.25, 0.23, 0.22, 0.23, 0.25],
            [0.24, 0.22, 0.21, 0.22, 0.24]
          ],
          spot: 100
        })
      })

      if (!response.ok) throw new Error('Calibration failed')
      
      toast({
        title: "Success",
        description: "Volatility surface calibrated successfully"
      })
      
      // Refresh data
      await fetchSurfaceData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calibrate surface",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Mock data for demonstration
  const mockSurfaceData = {
    strikes: Array.from({ length: 20 }, (_, i) => 80 + i * 2),
    expiries: Array.from({ length: 10 }, (_, i) => 7 + i * 10),
    surface: Array.from({ length: 10 }, (_, i) =>
      Array.from({ length: 20 }, (_, j) => 0.2 + Math.random() * 0.2)
    ),
    model: selectedModel
  }

  const mockGreekHeatmap = {
    greek: 'delta',
    strikes: [90, 95, 100, 105, 110],
    expiries: [30, 60, 90, 120, 180],
    values: Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => 0.5 - (j - 2) * 0.1 - i * 0.05)
    )
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Volatility Surface & Greeks</h1>
              <p className="text-muted-foreground">
                Real-time implied volatility surface with Greeks analysis
              </p>
            </div>
            <div className="flex items-center gap-4">
              {arbitrageStatus && (
                <Badge 
                  variant={arbitrageStatus.overall_arbitrage_free ? "default" : "destructive"}
                  className="gap-1"
                >
                  {arbitrageStatus.overall_arbitrage_free ? (
                    "Arbitrage Free"
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Arbitrage Detected
                    </>
                  )}
                </Badge>
              )}
              <Select value={selectedModel} onValueChange={(v: any) => setSelectedModel(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SSVI">SSVI</SelectItem>
                  <SelectItem value="ESSVI">ESSVI</SelectItem>
                  <SelectItem value="LSTM">LSTM</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleCalibrate} 
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Calibrate
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Volatility Surface - 2 columns */}
            <div className="lg:col-span-2">
              <VolatilitySurface3D 
                data={surfaceData || mockSurfaceData} 
                height={500}
              />
            </div>

            {/* Greeks Panel - 1 column */}
            <div className="space-y-6">
              <AggregateGreeks
                delta={greeksData?.delta || 245.5}
                gamma={greeksData?.gamma || 12.3}
                vega={greeksData?.vega || 8920}
                theta={greeksData?.theta || -1250}
                rho={greeksData?.rho || 450}
                totalValue={greeksData?.total_value || 1250000}
              />
            </div>
          </div>

          {/* Greeks Analysis Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="heatmap" className="w-full">
              <TabsList>
                <TabsTrigger value="heatmap">Greeks Heatmap</TabsTrigger>
                <TabsTrigger value="scenarios">Scenario Analysis</TabsTrigger>
                <TabsTrigger value="history">Historical Greeks</TabsTrigger>
                <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="heatmap" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <GreekHeatmap data={mockGreekHeatmap} />
                  <GreekHeatmap data={{ ...mockGreekHeatmap, greek: 'gamma' }} />
                  <GreekHeatmap data={{ ...mockGreekHeatmap, greek: 'vega' }} />
                </div>
              </TabsContent>

              <TabsContent value="scenarios" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Scenario Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Run what-if scenarios on your portfolio Greeks
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Historical Greeks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      View historical Greeks evolution over time
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Advanced risk metrics based on Greeks
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}