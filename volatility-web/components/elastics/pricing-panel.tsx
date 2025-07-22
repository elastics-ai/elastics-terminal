'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, TrendingUp, BarChart3, Info } from 'lucide-react'

interface PricerOutputs {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  price: number
}

export function PricingPanel() {
  const [optionType, setOptionType] = useState('vanilla-call')
  const [selectedPricer, setSelectedPricer] = useState('BS Quants')
  const [outputs, setOutputs] = useState<PricerOutputs>({
    delta: 0.57,
    gamma: 0.001,
    theta: -12.3,
    vega: 45.2,
    rho: 16.4,
    price: 77.512
  })

  const pricers = [
    { name: 'BS Quants', active: true },
    { name: 'Binomial', active: false },
    { name: 'Black 76', active: false },
    { name: 'Black Scholes', active: false }
  ]

  const metrics = [
    { label: 'METRICS', value: '', isHeader: true },
    { label: 'Delta', value: outputs.delta.toFixed(3) },
    { label: 'Gamma', value: outputs.gamma.toFixed(4) },
    { label: 'Theta', value: outputs.theta.toFixed(2) },
    { label: 'Vega', value: outputs.vega.toFixed(2) },
    { label: 'Rho', value: outputs.rho.toFixed(2) },
    { label: 'VALUE', value: '', isHeader: true },
    { label: 'Price', value: `$${outputs.price.toFixed(3)}`, highlight: true }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pricer</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedPricer} onValueChange={setSelectedPricer}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pricers.map((pricer) => (
                <SelectItem key={pricer.name} value={pricer.name}>
                  {pricer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pricer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pricer">Pricer</TabsTrigger>
          <TabsTrigger value="pricer-output">Pricer Output</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricer" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Option Type</Label>
              <Select value={optionType} onValueChange={setOptionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vanilla-call">Vanilla Call</SelectItem>
                  <SelectItem value="vanilla-put">Vanilla Put</SelectItem>
                  <SelectItem value="binary-call">Binary Call</SelectItem>
                  <SelectItem value="binary-put">Binary Put</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Underlying</Label>
              <Input defaultValue="SPY" />
            </div>
            <div>
              <Label className="text-xs">Strike (K)</Label>
              <Input type="number" defaultValue="100" />
            </div>
            <div>
              <Label className="text-xs">Spot (S)</Label>
              <Input type="number" defaultValue="100" />
            </div>
            <div>
              <Label className="text-xs">Volatility (σ)</Label>
              <Input type="number" defaultValue="0.2" step="0.01" />
            </div>
            <div>
              <Label className="text-xs">Risk-free Rate (r)</Label>
              <Input type="number" defaultValue="0.05" step="0.01" />
            </div>
            <div>
              <Label className="text-xs">Time to Expiry (T)</Label>
              <Input type="number" defaultValue="1" step="0.1" />
            </div>
            <div>
              <Label className="text-xs">Dividend Yield (q)</Label>
              <Input type="number" defaultValue="0" step="0.01" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button className="flex-1" variant="default">
              <Calculator className="w-4 h-4 mr-2" />
              Calculate
            </Button>
            <Button variant="outline">
              Reset
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="pricer-output" className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric, index) => (
              metric.isHeader ? (
                <div key={index} className="col-span-2 font-semibold text-xs text-gray-600 mt-2 first:mt-0">
                  {metric.label}
                </div>
              ) : (
                <>
                  <div key={`${index}-label`} className="text-sm text-gray-600">
                    {metric.label}
                  </div>
                  <div key={`${index}-value`} className={`text-sm font-medium text-right ${metric.highlight ? 'text-lg font-bold text-green-600' : ''}`}>
                    {metric.value}
                  </div>
                </>
              )
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Export Options</span>
              <Button variant="ghost" size="sm">
                <Info className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                Export to JSON
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <TrendingUp className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}