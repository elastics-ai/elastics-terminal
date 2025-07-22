'use client'

import React, { useState } from 'react'
import { ElasticsLayout } from '@/components/layout/elastics-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import { SSVISurface } from '@/components/elastics/ssvi-surface'
import { ElasticsRiskNeutralDensityChart } from '@/components/elastics/risk-neutral-density-chart'
import { elasticsApi } from '@/lib/api/elastics'

interface MetricData {
  metric: string
  value: number | string
}

interface PricerData {
  field: string
  value: string | number
}

export default function ElasticsModulesPage() {
  const [selectedModel, setSelectedModel] = useState('SSVI')
  const [selectedUnderlying, setSelectedUnderlying] = useState('Market IV')
  const [selectedOptionType, setSelectedOptionType] = useState('Vanilla Call')
  const [selectedPricer, setSelectedPricer] = useState('BS')
  const [calculating, setCalculating] = useState(false)
  const [priceResult, setPriceResult] = useState<any>(null)
  const [strike, setStrike] = useState(100000)
  const [maturity, setMaturity] = useState(0.25)

  const handleCalculatePrice = async () => {
    try {
      setCalculating(true)
      const result = await elasticsApi.calculatePrice({
        strike,
        maturity,
        option_type: selectedOptionType.toLowerCase().replace(' ', '_'),
        pricer_type: selectedPricer,
        symbol: 'BTC'
      })
      setPriceResult(result)
    } catch (error) {
      console.error('Error calculating price:', error)
    } finally {
      setCalculating(false)
    }
  }

  const metricsData: MetricData[] = priceResult?.results?.greeks ? [
    { metric: 'Delta', value: priceResult.results.greeks.delta.toFixed(4) },
    { metric: 'Gamma', value: priceResult.results.greeks.gamma.toFixed(6) },
    { metric: 'Vega', value: priceResult.results.greeks.vega.toFixed(2) },
    { metric: 'Theta', value: priceResult.results.greeks.theta.toFixed(2) },
    { metric: 'Rho', value: priceResult.results.greeks.rho.toFixed(2) },
  ] : [
    { metric: 'Delta', value: '-' },
    { metric: 'Gamma', value: '-' },
    { metric: 'Vega', value: '-' },
    { metric: 'Theta', value: '-' },
    { metric: 'Rho', value: '-' },
  ]

  return (
    <ElasticsLayout>
      <div className="flex h-full">
        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Modules</span>
                <ChevronRight className="w-4 h-4" />
                <span>Implied Volatility</span>
                <ChevronRight className="w-4 h-4" />
                <span>Bookmarks</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Contract Scanner</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-orange-100 text-orange-600">
                  Critical: 3
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-600">
                  Warning: 2
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                  Info: 6
                </Badge>
                <span className="text-sm text-muted-foreground">09:11:43 UTC</span>
              </div>
            </div>

            {/* Surface Title and Add Module Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">SSVI Surface</h1>
              <Button variant="outline" size="sm">
                + Add Module
              </Button>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - SSVI Surface */}
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Market IV</Label>
                        <Select value={selectedUnderlying} onValueChange={setSelectedUnderlying}>
                          <SelectTrigger className="w-32 h-8 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Market IV">Market IV</SelectItem>
                            <SelectItem value="SSVI">SSVI</SelectItem>
                            <SelectItem value="LSTN">LSTN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant={selectedModel === 'SSVI' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => setSelectedModel('SSVI')}
                          >
                            SSVI
                          </Button>
                          <Button
                            variant={selectedModel === 'ES3VI' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => setSelectedModel('ES3VI')}
                          >
                            ES3VI
                          </Button>
                          <Button
                            variant={selectedModel === 'LSTM' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => setSelectedModel('LSTM')}
                          >
                            LSTM
                          </Button>
                          <Button
                            variant={selectedModel === 'Wing' ? 'default' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => setSelectedModel('Wing')}
                          >
                            Wing
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-xs">
                        Deribit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Kaiko
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Parametric
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Portfolio only
                      </Button>
                    </div>
                  </div>

                  
                  {/* 3D Surface Chart */}
                  <div className="h-[400px]">
                    <SSVISurface />
                  </div>
                  
                  {/* Time Scale and Moneyness Scale */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Time Scale</Label>
                      <Tabs defaultValue="7d" className="mt-2">
                        <TabsList className="h-8">
                          <TabsTrigger value="1d" className="text-xs">1D</TabsTrigger>
                          <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                          <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                          <TabsTrigger value="90d" className="text-xs">90D</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Moneyness Scale</Label>
                      <Tabs defaultValue="auto" className="mt-2">
                        <TabsList className="h-8">
                          <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
                          <TabsTrigger value="fixed" className="text-xs">Fixed</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  
                  {/* Show Metrics */}
                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground">Show Metrics</Label>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="h-8">
                        Fit Misprice
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        Fit Astra
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        Fit Bimodality
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column - Risk-Neutral Density Surface */}
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="text-lg font-medium mb-4">Breeden-Litzenberger Risk-Neutral Density Surface</h3>
                  
                  {/* 3D Density Chart */}
                  <div className="h-[400px]">
                    <ElasticsRiskNeutralDensityChart data={[]} />
                  </div>
                  
                  {/* Strike Range and Show Metrics */}
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Strike Range</Label>
                      <Tabs defaultValue="auto" className="mt-2">
                        <TabsList className="h-8">
                          <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
                          <TabsTrigger value="fixed" className="text-xs">Fixed</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Show Metrics</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="h-8">
                          Time Scale
                        </Button>
                        <Button variant="outline" size="sm" className="h-8">
                          Strike Scale
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Bottom Section - Pricer */}
            <div className="grid grid-cols-3 gap-6">
              {/* Pricer Form */}
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Pricer</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Select Pricer</Label>
                      <Select value={selectedPricer} onValueChange={setSelectedPricer}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BS">BS Quanta</SelectItem>
                          <SelectItem value="Breeden">Breeden</SelectItem>
                          <SelectItem value="Black 76">Black 76</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Select Option Type</Label>
                      <Select value={selectedOptionType} onValueChange={setSelectedOptionType}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Vanilla Call">Vanilla Call</SelectItem>
                          <SelectItem value="Vanilla Put">Vanilla Put</SelectItem>
                          <SelectItem value="Binary Call">Binary Call</SelectItem>
                          <SelectItem value="Binary Put">Binary Put</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-8 bg-[#22c55e] hover:bg-[#16a34a]"
                    onClick={handleCalculatePrice}
                    disabled={calculating}
                  >
                    {calculating ? 'Calculating...' : 'Calculate Price'}
                  </Button>
                </div>
              </Card>

              {/* Pricer Output */}
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Pricer Output</h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">METRICS</Label>
                      <div className="text-sm font-medium mt-1">VALUE</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delta</span>
                      <span>0.57</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gamma</span>
                      <span>0.0041</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vega</span>
                      <span>45.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Theta</span>
                      <span>-12.3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rho</span>
                      <span>18.4</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Price Display */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <div className="text-3xl font-bold mt-1">
                      {priceResult?.results?.price 
                        ? `$${priceResult.results.price.toFixed(2)}`
                        : '$0.00'
                      }
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Explain difference between SSVI and eSSVI models</Label>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Compare the IV surface to 7 days ago</Label>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Export this surface as JSON</Label>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Run scenario analysis:</Label>
                    <Input 
                      placeholder="Ask anything..." 
                      className="h-8 mt-1"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ElasticsLayout>
  )
}