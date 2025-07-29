'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ElasticsLayout } from '@/components/layout/elastics-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  Edit2, 
  RefreshCw, 
  Database,
  GitBranch,
  Zap,
  Shield,
  Play,
  Upload,
  ChevronDown,
  Plus,
  Bot,
  Save,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentsAPI, Agent, WorkflowNode, WorkflowConnection } from '@/lib/api/agents'
import { useToast } from '@/components/ui/use-toast'

// Import types from API
type NodeType = WorkflowNode['type']

export default function AgentsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('Builder')
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showElementPanel, setShowElementPanel] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  
  // Agent workflow state
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: '1',
      type: 'data-source',
      name: 'Kalshi',
      position: { x: 100, y: 100 },
      data: { label: 'Kalshi' }
    },
    {
      id: '2',
      type: 'data-source',
      name: 'Polymarket',
      position: { x: 350, y: 100 },
      data: { label: 'Polymarket' }
    },
    {
      id: '3',
      type: 'data-source',
      name: 'Deribit',
      position: { x: 600, y: 100 },
      data: { label: 'Deribit' }
    },
    {
      id: '4',
      type: 'data-source',
      name: 'Twitter',
      position: { x: 850, y: 100 },
      data: { label: 'Twitter' }
    },
    {
      id: '5',
      type: 'function',
      name: 'Contract Matcher',
      position: { x: 225, y: 250 },
      data: { label: 'Contract Matcher' }
    },
    {
      id: '6',
      type: 'function',
      name: 'Implied Volatility',
      position: { x: 475, y: 250 },
      data: { label: 'Implied Volatility' }
    },
    {
      id: '7',
      type: 'function',
      name: 'Sentiment Analysis',
      position: { x: 725, y: 250 },
      data: { label: 'Sentiment Analysis' }
    },
    {
      id: '8',
      type: 'strategy',
      name: 'Market-Making-Strategy-01',
      position: { x: 350, y: 400 },
      data: { label: 'Market-Making-Strategy-01' }
    },
    {
      id: '9',
      type: 'risk',
      name: 'Hedging-System-01',
      position: { x: 600, y: 400 },
      data: { label: 'Hedging-System-01' }
    },
    {
      id: '10',
      type: 'execution',
      name: 'Engine-01',
      position: { x: 475, y: 550 },
      data: { label: 'Engine-01' }
    }
  ])

  const [connections, setConnections] = useState<WorkflowConnection[]>([
    { id: 'c1', source: '1', target: '5' },
    { id: 'c2', source: '2', target: '5' },
    { id: 'c3', source: '2', target: '6' },
    { id: 'c4', source: '3', target: '6' },
    { id: 'c5', source: '4', target: '7' },
    { id: 'c6', source: '5', target: '8' },
    { id: 'c7', source: '6', target: '8' },
    { id: 'c8', source: '7', target: '9' },
    { id: 'c9', source: '8', target: '10' },
    { id: 'c10', source: '9', target: '10' }
  ])

  // Load existing agents on mount
  useEffect(() => {
    loadAgents()
  }, [])
  
  const loadAgents = async () => {
    try {
      setLoading(true)
      const { agents } = await AgentsAPI.listAgents()
      if (agents.length > 0) {
        // Load the first agent for now
        const agent = agents[0]
        setCurrentAgent(agent)
        if (agent.workflow) {
          setNodes(agent.workflow.nodes)
          setConnections(agent.workflow.connections)
        }
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  const saveAgent = async () => {
    try {
      setSaving(true)
      
      const agent: Agent = {
        name: currentAgent?.name || 'Quant-Nexus-01',
        description: currentAgent?.description || 'AI Trading Agent',
        status: currentAgent?.status || 'draft',
        workflow: {
          nodes,
          connections,
        },
        config: currentAgent?.config || {},
      }
      
      if (currentAgent?.id) {
        // Update existing agent
        await AgentsAPI.updateAgent(currentAgent.id, agent)
        toast({
          title: 'Success',
          description: 'Agent saved successfully',
        })
      } else {
        // Create new agent
        const { agent_id } = await AgentsAPI.createAgent(agent)
        setCurrentAgent({ ...agent, id: agent_id })
        toast({
          title: 'Success',
          description: 'Agent created successfully',
        })
      }
    } catch (error) {
      console.error('Failed to save agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to save agent',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }
  
  const executeAgent = async (mode: 'backtest' | 'paper' | 'live' = 'backtest') => {
    if (!currentAgent?.id) {
      toast({
        title: 'Error',
        description: 'Please save the agent first',
        variant: 'destructive',
      })
      return
    }
    
    try {
      const { execution_id } = await AgentsAPI.executeAgent({
        agent_id: currentAgent.id,
        mode,
      })
      
      setExecutionId(execution_id)
      toast({
        title: 'Success',
        description: `Agent ${mode} started`,
      })
      
      // Start polling for execution status
      pollExecutionStatus(execution_id)
    } catch (error) {
      console.error('Failed to execute agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to execute agent',
        variant: 'destructive',
      })
    }
  }
  
  const pollExecutionStatus = async (execId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await AgentsAPI.getExecutionStatus(execId)
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval)
          
          if (status.status === 'completed') {
            toast({
              title: 'Execution Complete',
              description: 'Agent execution completed successfully',
            })
            
            // Load backtest results if it was a backtest
            if (status.mode === 'backtest' && currentAgent?.id) {
              const { results } = await AgentsAPI.getBacktestResults(currentAgent.id)
              console.log('Backtest results:', results)
            }
          } else {
            toast({
              title: 'Execution Failed',
              description: status.error || 'Agent execution failed',
              variant: 'destructive',
            })
          }
        }
      } catch (error) {
        console.error('Failed to poll execution status:', error)
        clearInterval(pollInterval)
      }
    }, 2000)
  }

  const getNodeStyle = (type: NodeType) => {
    const styles = {
      'data-source': 'bg-[#1a1a1a] border-blue-500',
      'function': 'bg-[#1a1a1a] border-purple-500',
      'strategy': 'bg-[#1a1a1a] border-green-500',
      'risk': 'bg-[#1a1a1a] border-red-500',
      'execution': 'bg-[#1a1a1a] border-gray-500'
    }
    return styles[type]
  }

  const getNodeIcon = (type: NodeType) => {
    const icons = {
      'data-source': <Database className="h-4 w-4" />,
      'function': <GitBranch className="h-4 w-4" />,
      'strategy': <Zap className="h-4 w-4" />,
      'risk': <Shield className="h-4 w-4" />,
      'execution': <Play className="h-4 w-4" />
    }
    return icons[type]
  }

  const elementCategories = [
    {
      name: 'Data Source',
      count: 24,
      items: ['Kalshi', 'Polymarket', 'Deribit', 'Twitter', 'Reddit', 'Bloomberg']
    },
    {
      name: 'Function',
      count: 6,
      items: ['Contract Matcher', 'Implied Volatility', 'eSSVI Surface', 'Greek Calculator', 'Sentiment Analysis']
    },
    {
      name: 'Strategy',
      count: 8,
      items: ['Market-Making-Strategy-01', 'Arbitrage-01', 'Delta-Neutral-01']
    },
    {
      name: 'Risk',
      count: 3,
      items: ['Hedging-System-01', 'VaR-Calculator', 'Exposure-Monitor']
    },
    {
      name: 'Execution',
      count: 2,
      items: ['Engine-01', 'Smart-Router-01']
    }
  ]

  return (
    <ElasticsLayout>
      <div className="flex h-full bg-background">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-foreground">Agents</h1>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                    ● Critical 3
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                    ● Warning 2
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                    ● Info 4
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">09:11:43 UTC</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card border-b border-border px-6">
            <div className="flex items-center gap-8">
              {['Overview', 'Builder', 'Backtester', 'Trade History'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-card border-b border-border px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Draft
                </Button>
                <span className="text-sm text-muted-foreground">Quant-Nexus-01</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={saveAgent}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary text-primary-foreground"
                  onClick={() => executeAgent('live')}
                  disabled={!currentAgent?.id}
                >
                  Execute
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Implement AI review
                    toast({
                      title: 'Coming Soon',
                      description: 'AI review feature is coming soon',
                    })
                  }}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Review with AI
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => executeAgent('backtest')}
                  disabled={!currentAgent?.id}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Backtest
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
            {/* Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #333 1px, transparent 1px),
                  linear-gradient(to bottom, #333 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map((connection) => {
                const sourceNode = nodes.find(n => n.id === connection.source)
                const targetNode = nodes.find(n => n.id === connection.target)
                if (!sourceNode || !targetNode) return null

                const sourceX = sourceNode.position.x + 150
                const sourceY = sourceNode.position.y + 30
                const targetX = targetNode.position.x + 75
                const targetY = targetNode.position.y

                // Calculate control points for curved path
                const midY = (sourceY + targetY) / 2

                return (
                  <path
                    key={connection.id}
                    d={`M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`}
                    stroke={connection.source === '8' || connection.source === '9' ? '#10b981' : '#a855f7'}
                    strokeWidth="2"
                    fill="none"
                    className="opacity-60"
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={cn(
                  'absolute rounded-lg border-2 p-4 cursor-move transition-all',
                  getNodeStyle(node.type),
                  selectedNode === node.id && 'ring-2 ring-primary'
                )}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  minWidth: '150px'
                }}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="flex items-center gap-2 text-white">
                  {getNodeIcon(node.type)}
                  <span className="text-sm font-medium">{node.data.label}</span>
                </div>
                {/* Connection points */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-background" />
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-background" />
              </div>
            ))}

            {/* Info box */}
            <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 text-sm">
              <div className="flex items-center gap-6 text-muted-foreground">
                <span>● Backtest this Agent over the last 30 days</span>
                <span>● Summarize this Agent's logic</span>
                <span>● Suggest improvements to this Agent</span>
                <span>● Deploy this Agent live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Elements Panel */}
        {showElementPanel && (
          <div className="w-80 bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Elements
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowElementPanel(false)}
                >
                  ×
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Drag & Drop Elements of Canvas
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {elementCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                      {category.name === 'Data Source' && <Database className="h-4 w-4" />}
                      {category.name === 'Function' && <GitBranch className="h-4 w-4" />}
                      {category.name === 'Strategy' && <Zap className="h-4 w-4" />}
                      {category.name === 'Risk' && <Shield className="h-4 w-4" />}
                      {category.name === 'Execution' && <Play className="h-4 w-4" />}
                      {category.name}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {category.count} Elements
                    </span>
                  </div>
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <button
                        key={item}
                        className="w-full text-left px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors cursor-grab"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground">{item}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                    <ChevronDown className="h-3 w-3 mr-1" />
                    See all
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ElasticsLayout>
  )
}