'use client'

import React, { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FlowBuilder } from '@/components/agent-builder/flow-builder'
import { AgentsList } from '@/components/agent-builder/agents-list'
import { AgentSimulator } from '@/components/agent-builder/agent-simulator'
import { 
  Bot, 
  Plus, 
  Play, 
  Save,
  Upload,
  Download,
  Search,
  Code
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'testing'
  lastRun?: Date
  performance?: {
    successRate: number
    avgExecutionTime: number
    totalRuns: number
  }
}

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeTab, setActiveTab] = useState('builder')
  
  // Mock agents data
  const [agents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Volatility Arbitrage Bot',
      description: 'Detects and trades volatility surface arbitrage opportunities',
      status: 'active',
      lastRun: new Date('2024-01-15T10:30:00'),
      performance: {
        successRate: 87.5,
        avgExecutionTime: 235,
        totalRuns: 1248
      }
    },
    {
      id: '2',
      name: 'Greeks Rebalancer',
      description: 'Automatically rebalances portfolio to maintain target Greeks',
      status: 'active',
      lastRun: new Date('2024-01-15T11:45:00'),
      performance: {
        successRate: 92.3,
        avgExecutionTime: 180,
        totalRuns: 856
      }
    },
    {
      id: '3',
      name: 'Market Maker Strategy',
      description: 'Provides liquidity in selected options contracts',
      status: 'testing',
      lastRun: new Date('2024-01-15T09:15:00'),
      performance: {
        successRate: 76.2,
        avgExecutionTime: 95,
        totalRuns: 42
      }
    }
  ])

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setSelectedAgent(null)
    setActiveTab('builder')
  }

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsCreatingNew(false)
  }

  const handleSaveAgent = () => {
    // Save agent logic
    console.log('Saving agent...')
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar with agents list */}
        <div className="w-80 border-r border-border bg-[hsl(var(--sidebar-bg))]">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Trading Agents</h2>
              <Button
                size="sm"
                onClick={handleCreateNew}
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search agents..."
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Agents list */}
          <AgentsList
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
          />
        </div>

        {/* Main content */}
        <div className="flex-1">
          {!selectedAgent && !isCreatingNew ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Agent Selected</h3>
                <p className="text-gray-500 mb-4">
                  Select an agent from the list or create a new one
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Agent
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-normal">
                      {isCreatingNew ? 'New Agent' : selectedAgent?.name}
                    </h1>
                    {selectedAgent && (
                      <div className="flex items-center gap-4 mt-1">
                        <Badge variant={selectedAgent.status === 'active' ? 'default' : 'secondary'}>
                          {selectedAgent.status}
                        </Badge>
                        {selectedAgent.lastRun && (
                          <span className="text-sm text-gray-500">
                            Last run: {selectedAgent.lastRun.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button size="sm" onClick={handleSaveAgent}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start px-6 border-b">
                  <TabsTrigger value="builder">Flow Builder</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="simulator">Simulator</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="builder" className="h-full m-0">
                    <FlowBuilder
                      agent={selectedAgent}
                      isNew={isCreatingNew}
                    />
                  </TabsContent>

                  <TabsContent value="code" className="h-full p-6">
                    <Card className="h-full p-4">
                      <div className="flex items-center mb-4">
                        <Code className="w-5 h-5 mr-2" />
                        <h3 className="text-lg font-medium">Agent Code</h3>
                      </div>
                      <pre className="bg-gray-900 p-4 rounded overflow-auto flex-1">
                        <code className="text-sm text-gray-300">
{`# Auto-generated agent code
import asyncio
from elastics_options import Greeks, SSVI
from trading_engine import OrderManager

class ${selectedAgent?.name.replace(/\s+/g, '') || 'NewAgent'}:
    def __init__(self):
        self.greeks_calculator = Greeks()
        self.order_manager = OrderManager()
        
    async def run(self, market_data):
        # Agent logic here
        pass
        
    async def on_market_update(self, update):
        # Handle real-time updates
        pass`}
                        </code>
                      </pre>
                    </Card>
                  </TabsContent>

                  <TabsContent value="simulator" className="h-full m-0">
                    <AgentSimulator agent={selectedAgent} />
                  </TabsContent>

                  <TabsContent value="performance" className="h-full p-6">
                    {selectedAgent?.performance && (
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <Card className="p-4">
                          <div className="text-sm text-gray-500 mb-1">Success Rate</div>
                          <div className="text-2xl font-medium">
                            {selectedAgent.performance.successRate}%
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="text-sm text-gray-500 mb-1">Avg Execution Time</div>
                          <div className="text-2xl font-medium">
                            {selectedAgent.performance.avgExecutionTime}ms
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="text-sm text-gray-500 mb-1">Total Runs</div>
                          <div className="text-2xl font-medium">
                            {selectedAgent.performance.totalRuns}
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="h-full p-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-medium mb-4">Agent Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Agent Name</Label>
                          <Input
                            id="name"
                            defaultValue={selectedAgent?.name || ''}
                            placeholder="Enter agent name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <textarea
                            id="description"
                            className="w-full p-2 rounded border border-gray-800 bg-gray-900"
                            rows={3}
                            defaultValue={selectedAgent?.description || ''}
                            placeholder="Describe what this agent does"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="trigger">Trigger Type</Label>
                          <Select defaultValue="schedule">
                            <SelectTrigger id="trigger">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="schedule">Schedule</SelectItem>
                              <SelectItem value="market-event">Market Event</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="webhook">Webhook</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}