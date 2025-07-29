'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Search, 
  Zap, 
  Shield, 
  TrendingUp, 
  Activity,
  Settings2,
  Brain,
  GitBranch,
  Database,
  BarChart3,
  FileText,
  Terminal,
  Cpu,
  Cloud,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Plus,
  Minus,
  Play,
  Pause,
  RotateCw
} from 'lucide-react'

interface FlowNode {
  id: string
  type: 'data' | 'function' | 'analysis' | 'strategy' | 'risk' | 'execution'
  label: string
  description?: string
  status?: 'active' | 'inactive' | 'processing'
  inputs?: string[]
  outputs?: string[]
  color: string
  icon: React.ElementType
  x: number
  y: number
}

interface FlowConnection {
  from: string
  to: string
  label?: string
  type?: 'data' | 'control'
}

export default function ElasticsFlowPage() {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [executionMode, setExecutionMode] = useState<'manual' | 'auto'>('manual')
  const [selectedTab, setSelectedTab] = useState('flow')

  // Flow diagram nodes
  const flowNodes: FlowNode[] = [
    {
      id: 'data-source-1',
      type: 'data',
      label: 'Kalshi',
      status: 'active',
      color: 'bg-blue-500',
      icon: Database,
      x: 50,
      y: 100
    },
    {
      id: 'data-source-2',
      type: 'data',
      label: 'Polymarket',
      status: 'active',
      color: 'bg-blue-500',
      icon: Database,
      x: 50,
      y: 200
    },
    {
      id: 'data-source-3',
      type: 'data',
      label: 'Deribit',
      status: 'active',
      color: 'bg-blue-500',
      icon: Database,
      x: 50,
      y: 300
    },
    {
      id: 'contract-matcher',
      type: 'function',
      label: 'Contract Matcher',
      description: 'Matches and normalizes contracts across sources',
      status: 'processing',
      color: 'bg-purple-500',
      icon: GitBranch,
      x: 250,
      y: 200
    },
    {
      id: 'implied-volatility',
      type: 'function',
      label: 'Implied Volatility',
      description: 'Calculates implied volatility from market prices',
      status: 'active',
      color: 'bg-purple-500',
      icon: Activity,
      x: 450,
      y: 200
    },
    {
      id: 'sentiment-analysis',
      type: 'analysis',
      label: 'Sentiment Analysis',
      description: 'Analyzes market sentiment from multiple sources',
      status: 'active',
      color: 'bg-green-500',
      icon: Brain,
      x: 650,
      y: 200
    },
    {
      id: 'strategy',
      type: 'strategy',
      label: 'Market-Making-Strategy-01',
      description: 'Automated market making with dynamic spreads',
      status: 'active',
      color: 'bg-teal-500',
      icon: TrendingUp,
      x: 250,
      y: 400
    },
    {
      id: 'risk',
      type: 'risk',
      label: 'Hedging-System-01',
      description: 'Real-time risk management and hedging',
      status: 'active',
      color: 'bg-orange-500',
      icon: Shield,
      x: 550,
      y: 400
    },
    {
      id: 'execution',
      type: 'execution',
      label: 'Engine-01',
      description: 'Smart order routing and execution',
      status: 'active',
      color: 'bg-red-500',
      icon: Zap,
      x: 400,
      y: 550
    }
  ]

  const flowConnections: FlowConnection[] = [
    { from: 'data-source-1', to: 'contract-matcher', type: 'data' },
    { from: 'data-source-2', to: 'contract-matcher', type: 'data' },
    { from: 'data-source-3', to: 'contract-matcher', type: 'data' },
    { from: 'contract-matcher', to: 'implied-volatility', type: 'data' },
    { from: 'implied-volatility', to: 'sentiment-analysis', type: 'data' },
    { from: 'contract-matcher', to: 'strategy', type: 'data' },
    { from: 'sentiment-analysis', to: 'risk', type: 'data' },
    { from: 'strategy', to: 'execution', type: 'control' },
    { from: 'risk', to: 'execution', type: 'control' }
  ]

  const getNodeStyle = (node: FlowNode) => {
    const baseStyle = 'absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200'
    const activeStyle = activeNode === node.id ? 'scale-110 shadow-lg z-10' : 'hover:scale-105'
    return `${baseStyle} ${activeStyle}`
  }

  const getNodeColor = (node: FlowNode) => {
    if (node.status === 'processing') return 'bg-yellow-500'
    if (node.status === 'inactive') return 'bg-gray-400'
    return node.color
  }

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Elastics</h1>
          <p className="text-muted-foreground">Visual workflow builder for market analysis and execution</p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="flow">Builder</TabsTrigger>
            <TabsTrigger value="backtest">Backtest</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
          </TabsList>

          <TabsContent value="flow" className="space-y-4">
            {/* Execution Controls */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                  </Button>
                  <Button size="lg" variant="outline">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="execution-mode">Mode:</Label>
                    <select
                      id="execution-mode"
                      className="px-3 py-1 border rounded-md"
                      value={executionMode}
                      onChange={(e) => setExecutionMode(e.target.value as 'manual' | 'auto')}
                    >
                      <option value="manual">Manual</option>
                      <option value="auto">Automatic</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Review with AI
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-1" />
                    Backtest
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings2 className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </Card>

            {/* Flow Diagram */}
            <Card className="p-6">
              <div className="relative h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
                {/* Grid background */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {flowConnections.map((connection, index) => {
                    const fromNode = flowNodes.find(n => n.id === connection.from)
                    const toNode = flowNodes.find(n => n.id === connection.to)
                    if (!fromNode || !toNode) return null

                    return (
                      <g key={index}>
                        <line
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={connection.type === 'control' ? '#ef4444' : '#3b82f6'}
                          strokeWidth="2"
                          strokeDasharray={connection.type === 'control' ? '5,5' : undefined}
                          className="transition-all duration-200"
                        />
                        <circle
                          cx={toNode.x}
                          cy={toNode.y}
                          r="4"
                          fill={connection.type === 'control' ? '#ef4444' : '#3b82f6'}
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* Nodes */}
                {flowNodes.map((node) => {
                  const Icon = node.icon
                  return (
                    <div
                      key={node.id}
                      className={getNodeStyle(node)}
                      style={{ left: `${node.x}px`, top: `${node.y}px` }}
                      onClick={() => setActiveNode(node.id)}
                    >
                      <Card className={`p-4 cursor-pointer ${getNodeColor(node)} text-white min-w-[160px]`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5" />
                          <span className="font-semibold text-sm">{node.label}</span>
                        </div>
                        {node.description && (
                          <p className="text-xs opacity-90">{node.description}</p>
                        )}
                        {node.status === 'processing' && (
                          <div className="mt-2 flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span className="text-xs">Processing...</span>
                          </div>
                        )}
                      </Card>
                    </div>
                  )
                })}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-md">
                  <div className="text-xs font-semibold mb-2">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded" />
                      <span className="text-xs">Data Source</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded" />
                      <span className="text-xs">Function</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span className="text-xs">Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-teal-500 rounded" />
                      <span className="text-xs">Strategy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded" />
                      <span className="text-xs">Risk</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Node Details */}
            {activeNode && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {flowNodes.find(n => n.id === activeNode)?.label}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveNode(null)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Badge variant="outline" className="mt-1">
                      {flowNodes.find(n => n.id === activeNode)?.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Badge variant="secondary" className="mt-1">
                      {flowNodes.find(n => n.id === activeNode)?.type}
                    </Badge>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="backtest" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Backtest Configuration</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Initial Capital</Label>
                  <Input type="number" placeholder="$100,000" className="mt-1" />
                </div>
                <Button className="w-full">Run Backtest</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Trade History</h3>
              <div className="text-center text-muted-foreground py-8">
                No trades executed yet
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-white p-6 overflow-auto">
        <div className="space-y-6">
          {/* Account Status */}
          <div>
            <h3 className="font-semibold mb-3">Account is Track</h3>
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">@Deltanine @DNResearch @Tix10k</span>
              </div>
            </Card>
          </div>

          {/* Sentiment */}
          <div>
            <h3 className="font-semibold mb-3">Sentiment</h3>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Extremely Negative</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }} />
              </div>
            </Card>
          </div>

          {/* Tweets */}
          <div>
            <h3 className="font-semibold mb-3">Tweets</h3>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">"Microsoft announces new partnership with OpenAI to integrate ChatGPT across Azure ecosystem"</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>#Microsoft</span>
                    <span>#AI</span>
                    <span>#Azure</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Triggers */}
          <div>
            <h3 className="font-semibold mb-3">Triggers</h3>
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">"Spotify Q4 earnings beat expectations with strong ad-supported user growth in emerging markets"</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">#Spotify</span>
                  <Badge variant="outline" className="text-xs">Bullish</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">#Earnings</span>
                  <Badge variant="outline" className="text-xs">Bullish</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">#Growth</span>
                  <Badge variant="outline" className="text-xs">Bullish</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* SEC Filings */}
          <div>
            <h3 className="font-semibold mb-3">Triggers</h3>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                "SEC initiates inquiry into Spotify's podcast acquisition practices, shares dip in pre-market"
              </div>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="text-xs">#Spotify</Badge>
                <Badge variant="outline" className="text-xs">#Regulation</Badge>
                <Badge variant="outline" className="text-xs">#Risk</Badge>
                <Badge variant="destructive" className="text-xs">Bearish</Badge>
              </div>
            </Card>
          </div>

          {/* Deploy Agent */}
          <Button className="w-full" variant="secondary">
            <Cloud className="w-4 h-4 mr-2" />
            Deploy this Agent to
          </Button>
        </div>
      </div>
    </div>
  )
}