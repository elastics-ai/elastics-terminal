import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  RotateCcw,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AgentSimulatorProps {
  agent: any
}

export function AgentSimulator({ agent }: AgentSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [timeframe, setTimeframe] = useState('1d')
  
  // Mock simulation results
  const [results] = useState({
    totalTrades: 245,
    profitableTrades: 187,
    totalPnL: 125430,
    sharpeRatio: 1.85,
    maxDrawdown: -8.5,
    events: [
      { time: '09:30', type: 'success', message: 'Detected volatility arbitrage opportunity' },
      { time: '09:31', type: 'info', message: 'Placed buy order for SPX 4500C' },
      { time: '09:32', type: 'success', message: 'Order filled at $45.50' },
      { time: '09:45', type: 'warning', message: 'Approaching risk limit' },
      { time: '10:15', type: 'success', message: 'Closed position with 2.5% profit' },
      { time: '10:30', type: 'error', message: 'Failed to execute hedge due to liquidity' },
    ]
  })
  
  // Mock performance data
  const [performanceData] = useState([
    { time: '09:00', pnl: 0, positions: 0 },
    { time: '09:30', pnl: 500, positions: 2 },
    { time: '10:00', pnl: 1200, positions: 3 },
    { time: '10:30', pnl: 950, positions: 2 },
    { time: '11:00', pnl: 1800, positions: 4 },
    { time: '11:30', pnl: 2100, positions: 3 },
    { time: '12:00', pnl: 2500, positions: 5 },
  ])

  const handleStartSimulation = () => {
    setIsRunning(true)
    // Simulate progress
    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          return 100
        }
        return prev + (1 * simulationSpeed)
      })
    }, 100)
  }

  const handleStopSimulation = () => {
    setIsRunning(false)
  }

  const handleResetSimulation = () => {
    setSimulationProgress(0)
    setIsRunning(false)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="h-full flex">
      {/* Left side - Controls */}
      <div className="w-80 border-r border-border p-6">
        <h3 className="text-lg font-medium mb-4">Simulation Settings</h3>
        
        <div className="space-y-6">
          {/* Timeframe */}
          <div>
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger id="timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="1w">1 Week</SelectItem>
                <SelectItem value="1m">1 Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Start Date */}
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                id="start-date"
                className="flex-1 p-2 rounded border border-gray-800 bg-gray-900"
                defaultValue="2024-01-01"
              />
            </div>
          </div>
          
          {/* Simulation Speed */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Simulation Speed</Label>
              <span className="text-sm text-gray-500">{simulationSpeed}x</span>
            </div>
            <Slider
              value={[simulationSpeed]}
              onValueChange={([value]) => setSimulationSpeed(value)}
              min={0.5}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>
          
          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={isRunning ? handleStopSimulation : handleStartSimulation}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleResetSimulation}
              disabled={isRunning}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Progress</Label>
              <span className="text-sm text-gray-500">{simulationProgress}%</span>
            </div>
            <Progress value={simulationProgress} className="w-full" />
          </div>
        </div>
        
        {/* Results Summary */}
        {simulationProgress === 100 && (
          <Card className="mt-6 p-4">
            <h4 className="font-medium mb-3">Results Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Trades</span>
                <span>{results.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Success Rate</span>
                <span>{((results.profitableTrades / results.totalTrades) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total P&L</span>
                <span className="text-green-500">+${results.totalPnL.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sharpe Ratio</span>
                <span>{results.sharpeRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Drawdown</span>
                <span className="text-red-500">{results.maxDrawdown}%</span>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Right side - Visualization */}
      <div className="flex-1 p-6">
        {/* Performance Chart */}
        <Card className="p-6 mb-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-medium">Performance</h3>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="P&L"
                />
                <Line 
                  type="monotone" 
                  dataKey="positions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Positions"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Event Log */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Event Log</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.events.map((event, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded bg-gray-900"
              >
                {getEventIcon(event.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{event.time}</span>
                    <Badge
                      variant={event.type === 'error' ? 'destructive' : 'default'}
                      className="text-xs"
                    >
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-sm">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}