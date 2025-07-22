'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  ChevronDown, 
  Plus, 
  Database, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  Terminal,
  Settings,
  BarChart3,
  GitBranch,
  Shield,
  Clock,
  Calculator
} from 'lucide-react'

const dataSourceElements = [
  { name: 'Kalshi', icon: Database, color: 'blue' },
  { name: 'Polymarket', icon: Database, color: 'blue' },
  { name: 'Deribit', icon: Database, color: 'blue' },
  { name: 'Twitter', icon: Database, color: 'blue' },
]

const functionElements = [
  { name: 'Contract Matcher', icon: Zap, color: 'purple' },
  { name: 'Implied Volatility', icon: Zap, color: 'purple' },
  { name: 'eSGVI Surface', icon: Zap, color: 'purple' },
  { name: 'Greek Calculator', icon: Calculator, color: 'purple' },
  { name: 'Sentiment Analysis', icon: Zap, color: 'purple' },
]

const strategyElements = [
  { name: 'Market Making', icon: TrendingUp, color: 'green' },
  { name: 'Arbitrage', icon: TrendingUp, color: 'green' },
  { name: 'Momentum', icon: TrendingUp, color: 'green' },
  { name: 'Mean Reversion', icon: TrendingUp, color: 'green' },
]

const riskElements = [
  { name: 'Position Limits', icon: Shield, color: 'orange' },
  { name: 'Stop Loss', icon: Shield, color: 'orange' },
  { name: 'Hedging System', icon: Shield, color: 'orange' },
  { name: 'Risk Metrics', icon: BarChart3, color: 'orange' },
]

const executionElements = [
  { name: 'Order Engine', icon: Terminal, color: 'gray' },
  { name: 'Smart Router', icon: GitBranch, color: 'gray' },
  { name: 'Execution Algo', icon: Terminal, color: 'gray' },
]

export function AgentPropertiesPanel() {
  const [activeTab, setActiveTab] = useState('elements')
  const [searchQuery, setSearchQuery] = useState('')

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      gray: 'bg-gray-50 border-gray-300 text-gray-700',
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.gray
  }

  const renderElement = (element: any, index: number) => {
    const Icon = element.icon
    return (
      <div
        key={index}
        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-move hover:shadow-md transition-shadow ${getColorClasses(element.color)}`}
        draggable
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{element.name}</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="elements">
            <Plus className="w-4 h-4 mr-2" />
            Add Elements
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Settings className="w-4 h-4 mr-2" />
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elements" className="flex-1 overflow-y-auto space-y-4">
          <div>
            <Input
              type="search"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          </div>

          <div className="space-y-6">
            {/* Data Sources */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Source
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {dataSourceElements.length} Elements
                </Badge>
              </div>
              <div className="space-y-2">
                {dataSourceElements.map((element, index) => renderElement(element, index))}
              </div>
            </div>

            {/* Functions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Function
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {functionElements.length} Elements
                </Badge>
              </div>
              <div className="space-y-2">
                {functionElements.map((element, index) => renderElement(element, index))}
              </div>
            </div>

            {/* Strategies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Strategy
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {strategyElements.length} Elements
                </Badge>
              </div>
              <div className="space-y-2">
                {strategyElements.map((element, index) => renderElement(element, index))}
              </div>
            </div>

            {/* Risk */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {riskElements.length} Elements
                </Badge>
              </div>
              <div className="space-y-2">
                {riskElements.map((element, index) => renderElement(element, index))}
              </div>
            </div>

            {/* Execution */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Execution
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {executionElements.length} Elements
                </Badge>
              </div>
              <div className="space-y-2">
                {executionElements.map((element, index) => renderElement(element, index))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">Selected Element</h3>
              <p className="text-sm text-muted-foreground">
                Click on an element in the canvas to view and edit its properties
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Drag & Drop elements to the canvas
        </p>
      </div>
    </div>
  )
}