'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RebalancingConfig } from '@/components/bookkeeper/rebalancing-config'
import { SuggestedTradesTable } from '@/components/bookkeeper/suggested-trades-table'
import { 
  TrendingUp, 
  Target, 
  Activity,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TargetGreeks {
  delta: number
  gamma: number
  vega: number
  theta: number
  rho: number
}

interface OptimizationResult {
  status: string
  suggestedTrades: any[]
  newGreeks: TargetGreeks
  cost: number
  message?: string
}

export default function BookkeeperPage() {
  const [targetGreeks, setTargetGreeks] = useState<TargetGreeks>({
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
    rho: 0
  })
  
  const [currentGreeks, setCurrentGreeks] = useState<TargetGreeks>({
    delta: 0.25,
    gamma: 0.05,
    vega: 15.2,
    theta: -8.5,
    rho: 12.3
  })

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [autoRebalance, setAutoRebalance] = useState(false)
  const [rebalanceInterval, setRebalanceInterval] = useState('1h')
  const [maxDeviation, setMaxDeviation] = useState(10)

  // Mock historical Greeks data
  const [historicalData] = useState([
    { time: '09:00', delta: 0.25, gamma: 0.05, vega: 15.2, theta: -8.5 },
    { time: '10:00', delta: 0.23, gamma: 0.04, vega: 14.8, theta: -8.2 },
    { time: '11:00', delta: 0.27, gamma: 0.06, vega: 15.5, theta: -8.8 },
    { time: '12:00', delta: 0.24, gamma: 0.05, vega: 15.0, theta: -8.4 },
    { time: '13:00', delta: 0.26, gamma: 0.05, vega: 15.3, theta: -8.6 },
    { time: '14:00', delta: 0.25, gamma: 0.05, vega: 15.2, theta: -8.5 },
  ])

  const handleOptimize = async () => {
    setIsOptimizing(true)
    
    try {
      const response = await fetch('/api/bookkeeper/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGreeks,
          currentGreeks,
          maxCost: 100000,
          constraints: {
            maxPositionSize: 100,
            minPositionSize: 1,
            allowedInstruments: ['options', 'futures']
          }
        })
      })
      
      const result = await response.json()
      setOptimizationResult(result)
    } catch (error) {
      console.error('Optimization failed:', error)
      setOptimizationResult({
        status: 'error',
        suggestedTrades: [],
        newGreeks: currentGreeks,
        cost: 0,
        message: 'Optimization failed. Please try again.'
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleExecuteTrades = async () => {
    if (!optimizationResult || optimizationResult.suggestedTrades.length === 0) return
    
    // Execute trades through API
    console.log('Executing trades:', optimizationResult.suggestedTrades)
    
    // Update current Greeks after execution
    setCurrentGreeks(optimizationResult.newGreeks)
    setOptimizationResult(null)
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal mb-1">Bookkeeper</h1>
            <p className="text-gray-500">Portfolio Greek optimization and rebalancing</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRebalance}
                onCheckedChange={setAutoRebalance}
              />
              <Label>Auto-rebalance</Label>
            </div>
            
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Optimize Portfolio
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Current Portfolio Greeks */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-medium">Current Portfolio Greeks</h2>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(currentGreeks).map(([greek, value]) => (
              <div key={greek} className="text-center">
                <div className="text-sm text-gray-500 mb-1 capitalize">{greek}</div>
                <div className="text-2xl font-medium">{value.toFixed(2)}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Target: {targetGreeks[greek as keyof TargetGreeks].toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Tabs defaultValue="targets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="targets">Target Greeks</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="targets" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <Target className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-medium">Configure Target Greeks</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {Object.entries(targetGreeks).map(([greek, value]) => (
                  <div key={greek} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="capitalize">{greek}</Label>
                      <span className="text-sm text-gray-500">{value.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([newValue]) => {
                        setTargetGreeks(prev => ({
                          ...prev,
                          [greek]: newValue
                        }))
                      }}
                      min={greek === 'theta' ? -50 : -20}
                      max={greek === 'theta' ? 0 : 50}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            {optimizationResult && (
              <>
                {optimizationResult.status === 'success' ? (
                  <>
                    <Alert>
                      <TrendingUp className="w-4 h-4" />
                      <AlertDescription>
                        Optimization complete. Found {optimizationResult.suggestedTrades.length} trades
                        to achieve target Greeks. Estimated cost: ${optimizationResult.cost.toFixed(2)}
                      </AlertDescription>
                    </Alert>
                    
                    <SuggestedTradesTable
                      trades={optimizationResult.suggestedTrades}
                      onExecute={handleExecuteTrades}
                    />
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      {optimizationResult.message || 'Optimization failed'}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
            
            {!optimizationResult && !isOptimizing && (
              <Card className="p-8 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 mb-4">
                  Configure your target Greeks and click "Optimize Portfolio" to get trade suggestions
                </p>
              </Card>
            )}
            
            {isOptimizing && (
              <Card className="p-8">
                <div className="space-y-4">
                  <Progress value={65} className="w-full" />
                  <p className="text-center text-gray-500">
                    Calculating optimal trades...
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-medium">Greeks Evolution</h3>
              </div>
              
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="delta" stroke="#3b82f6" name="Delta" />
                    <Line type="monotone" dataKey="gamma" stroke="#10b981" name="Gamma" />
                    <Line type="monotone" dataKey="vega" stroke="#f59e0b" name="Vega" />
                    <Line type="monotone" dataKey="theta" stroke="#ef4444" name="Theta" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <RebalancingConfig
              autoRebalance={autoRebalance}
              rebalanceInterval={rebalanceInterval}
              maxDeviation={maxDeviation}
              onAutoRebalanceChange={setAutoRebalance}
              onIntervalChange={setRebalanceInterval}
              onMaxDeviationChange={setMaxDeviation}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}