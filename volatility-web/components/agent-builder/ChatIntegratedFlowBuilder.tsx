'use client'

import React, { useCallback, useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  NodeTypes,
  useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  TrendingUp, 
  GitBranch, 
  Calculator,
  Send,
  Timer,
  Filter,
  AlertCircle,
  Plus,
  MessageSquare,
  Eye,
  Play,
  Code,
  Zap
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { toast } from '@/components/ui/use-toast'

interface ChatIntegratedFlowBuilderProps {
  flowId?: string
  sessionId: string
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void
  onNodeSelect?: (node: Node | null) => void
  chatMode?: boolean
}

interface StrategyNode extends Node {
  data: {
    label: string
    type: string
    description?: string
    generatedCode?: string
    codeStatus?: 'pending' | 'generated' | 'error'
    chatHighlight?: boolean
    lastUpdated?: string
  }
}

const nodeTypeConfig = {
  data: {
    icon: Database,
    label: 'Data Source',
    color: 'bg-blue-500',
    borderColor: 'border-blue-200'
  },
  function: {
    icon: Calculator,
    label: 'Function',
    color: 'bg-purple-500',
    borderColor: 'border-purple-200'
  },
  strategy: {
    icon: TrendingUp,
    label: 'Strategy',
    color: 'bg-green-500',
    borderColor: 'border-green-200'
  },
  risk: {
    icon: AlertCircle,
    label: 'Risk',
    color: 'bg-red-500',
    borderColor: 'border-red-200'
  },
  execution: {
    icon: Send,
    label: 'Execution',
    color: 'bg-gray-500',
    borderColor: 'border-gray-300'
  }
}

// Custom node component with chat integration features
const StrategyNodeComponent = ({ id, data, selected }: { id: string, data: any, selected: boolean }) => {
  const config = nodeTypeConfig[data.type as keyof typeof nodeTypeConfig] || nodeTypeConfig.function
  const Icon = config.icon
  
  return (
    <div 
      className={`
        relative px-4 py-3 rounded-lg border-2 bg-card shadow-sm transition-all duration-200
        ${selected ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}
        ${data.chatHighlight ? 'ring-2 ring-yellow-400 ring-opacity-75 animate-pulse' : ''}
        ${config.borderColor}
        hover:shadow-md
      `}
    >
      {/* Status indicators */}
      <div className="absolute -top-2 -right-2 flex gap-1">
        {data.codeStatus === 'generated' && (
          <Badge variant="secondary" className="h-5 text-xs">
            <Code className="w-3 h-3 mr-1" />
            Code
          </Badge>
        )}
        {data.codeStatus === 'pending' && (
          <Badge variant="outline" className="h-5 text-xs">
            <Timer className="w-3 h-3 mr-1" />
            AI
          </Badge>
        )}
        {data.chatHighlight && (
          <Badge variant="default" className="h-5 text-xs bg-yellow-500">
            <MessageSquare className="w-3 h-3" />
          </Badge>
        )}
      </div>
      
      {/* Node content */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${config.color} text-white`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground mb-1">
            {config.label}
          </div>
          <div className="font-medium text-sm truncate">
            {data.label}
          </div>
          {data.description && (
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {data.description}
            </div>
          )}
        </div>
      </div>
      
      {/* Connection handles - ReactFlow will add these automatically */}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  strategyNode: StrategyNodeComponent
}

export function ChatIntegratedFlowBuilder({ 
  flowId, 
  sessionId, 
  onFlowChange, 
  onNodeSelect,
  chatMode = false 
}: ChatIntegratedFlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<StrategyNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<StrategyNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  
  const reactFlowInstance = useReactFlow()
  const highlightTimeoutRef = useRef<NodeJS.Timeout>()
  
  // WebSocket connection for real-time updates
  const { socket, isConnected } = useWebSocket('/ws', {
    onMessage: handleWebSocketMessage
  })
  
  // Subscribe to strategy builder events
  useEffect(() => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'subscribe_strategy_builder',
        session_id: sessionId
      }))
    }
  }, [socket, isConnected, sessionId])
  
  // Handle real-time WebSocket messages
  function handleWebSocketMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data)
      
      if (message.type === 'strategy_builder_event') {
        handleStrategyBuilderEvent(message)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }
  
  // Handle strategy builder events from WebSocket
  function handleStrategyBuilderEvent(message: any) {
    const { event_type, data } = message
    
    switch (event_type) {
      case 'strategy_created':
        handleStrategyCreated(data)
        break
      case 'node_added':
        handleNodeAdded(data)
        break
      case 'node_updated':
        handleNodeUpdated(data)
        break
      case 'nodes_connected':
        handleNodesConnected(data)
        break
      case 'code_generated':
        handleCodeGenerated(data)
        break
      case 'chat_message_processed':
        handleChatMessageProcessed(data)
        break
      default:
        console.log('Unhandled strategy builder event:', event_type)
    }
  }
  
  // Event handlers for different WebSocket events
  const handleStrategyCreated = useCallback((data: any) => {
    if (data.flow_id !== flowId) return
    
    const newNodes: StrategyNode[] = data.nodes.map((node: any, index: number) => ({
      id: node.id,
      type: 'strategyNode',
      position: node.position || { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
      data: {
        label: node.name || node.type,
        type: node.type,
        description: node.description,
        codeStatus: 'pending'
      }
    }))
    
    const newEdges: Edge[] = data.connections.map((conn: any, index: number) => ({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      animated: true
    }))
    
    setNodes(newNodes)
    setEdges(newEdges)
    
    // Animate flow creation
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 })
    }, 100)
    
    toast({
      title: "Strategy Created",
      description: `${data.strategy_name} with ${data.node_count} nodes`,
    })
  }, [flowId, reactFlowInstance, setNodes, setEdges])
  
  const handleNodeAdded = useCallback((data: any) => {
    if (data.flow_id !== flowId) return
    
    const newNode: StrategyNode = {
      id: data.node.id,
      type: 'strategyNode',
      position: data.node.position,
      data: {
        label: data.node.description.split(' ').slice(0, 3).join(' ') || data.node.type,
        type: data.node.type,
        description: data.node.description,
        codeStatus: data.has_generated_code ? 'generated' : 'pending',
        chatHighlight: true
      }
    }
    
    setNodes(prev => [...prev, newNode])
    
    // Highlight the new node
    highlightNode(data.node.id)
    
    // Pan to the new node
    setTimeout(() => {
      reactFlowInstance.setCenter(
        data.node.position.x + 100, 
        data.node.position.y + 50,
        { zoom: 1.2, duration: 600 }
      )
    }, 100)
    
    toast({
      title: "Node Added",
      description: `${data.node.type} node added to strategy`,
    })
  }, [flowId, reactFlowInstance, setNodes])
  
  const handleNodeUpdated = useCallback((data: any) => {
    if (data.flow_id !== flowId) return
    
    setNodes(prev => prev.map(node => {
      if (node.id === data.node_id) {
        return {
          ...node,
          data: {
            ...node.data,
            description: data.new_description || node.data.description,
            codeStatus: data.translation_status === 'success' ? 'generated' : 'pending',
            chatHighlight: true,
            lastUpdated: new Date().toISOString()
          }
        }
      }
      return node
    }))
    
    highlightNode(data.node_id)
    
    toast({
      title: "Node Updated",
      description: `${data.updated_property} property updated`,
    })
  }, [flowId, setNodes])
  
  const handleNodesConnected = useCallback((data: any) => {
    if (data.flow_id !== flowId) return
    
    const newEdge: Edge = {
      id: `edge-${data.connection.from}-${data.connection.to}`,
      source: data.connection.from,
      target: data.connection.to,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 }
    }
    
    setEdges(prev => [...prev, newEdge])
    
    // Highlight both connected nodes
    highlightNode(data.connection.from)
    highlightNode(data.connection.to)
    
    toast({
      title: "Nodes Connected",
      description: "Data flow connection established",
    })
  }, [flowId, setEdges])
  
  const handleCodeGenerated = useCallback((data: any) => {
    if (data.flow_id !== flowId) return
    
    setNodes(prev => prev.map(node => {
      if (node.id === data.node_id) {
        return {
          ...node,
          data: {
            ...node.data,
            codeStatus: data.generation_status === 'success' ? 'generated' : 'error',
            generatedCode: data.code_preview,
            chatHighlight: true
          }
        }
      }
      return node
    }))
    
    highlightNode(data.node_id)
    
    if (data.generation_status === 'success') {
      toast({
        title: "Code Generated",
        description: `Python code generated for node`,
      })
    }
  }, [flowId, setNodes])
  
  const handleChatMessageProcessed = useCallback((data: any) => {
    // Visual feedback for chat message processing
    if (data.success && data.affects_flow) {
      setIsLoading(false)
    }
  }, [])
  
  // Utility function to highlight nodes temporarily
  const highlightNode = useCallback((nodeId: string) => {
    setHighlightedNodes(prev => new Set([...prev, nodeId]))
    
    // Clear highlight after 3 seconds
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedNodes(prev => {
        const newSet = new Set(prev)
        newSet.delete(nodeId)
        return newSet
      })
      
      // Remove chat highlight from nodes
      setNodes(prev => prev.map(node => ({
        ...node,
        data: { ...node.data, chatHighlight: false }
      })))
    }, 3000)
  }, [setNodes])
  
  // Handle node connections in the flow
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep'
      }
      setEdges(eds => addEdge(newEdge, eds))
    },
    [setEdges]
  )
  
  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: StrategyNode) => {
    setSelectedNode(node)
    onNodeSelect?.(node)
  }, [onNodeSelect])
  
  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect?.(null)
  }, [onNodeSelect])
  
  // Notify parent of flow changes
  useEffect(() => {
    onFlowChange?.(nodes, edges)
  }, [nodes, edges, onFlowChange])
  
  // Validate flow function
  const validateFlow = useCallback(() => {
    const dataNodes = nodes.filter(n => n.data.type === 'data')
    const executionNodes = nodes.filter(n => n.data.type === 'execution')
    
    const issues = []
    if (dataNodes.length === 0) issues.push('No data source nodes')
    if (executionNodes.length === 0) issues.push('No execution nodes')
    if (edges.length === 0 && nodes.length > 1) issues.push('Nodes are not connected')
    
    if (issues.length > 0) {
      toast({
        title: "Flow Validation",
        description: issues.join(', '),
        variant: "destructive"
      })
    } else {
      toast({
        title: "Flow Valid",
        description: "Strategy flow looks good!",
      })
    }
  }, [nodes, edges])
  
  return (
    <div className="h-full w-full relative">
      {/* Connection status indicator */}
      {!isConnected && (
        <div className="absolute top-4 right-4 z-50">
          <Badge variant="destructive">
            Disconnected
          </Badge>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Processing chat command...</span>
          </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        {/* Top panel with flow info */}
        <Panel position="top-left">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Live</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span>{nodes.length} nodes</span>
              <span className="text-muted-foreground">•</span>
              <span>{edges.length} connections</span>
            </div>
          </Card>
        </Panel>
        
        {/* Control panel */}
        <Panel position="top-right">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={validateFlow}>
              <Eye className="w-4 h-4 mr-1" />
              Validate
            </Button>
            <Button size="sm" variant="outline">
              <Play className="w-4 h-4 mr-1" />
              Test
            </Button>
            <Button size="sm">
              <Code className="w-4 h-4 mr-1" />
              Generate
            </Button>
          </div>
        </Panel>
        
        {/* Chat mode indicator */}
        {chatMode && (
          <Panel position="bottom-left">
            <Card className="p-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span>Chat Mode Active</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              </div>
            </Card>
          </Panel>
        )}
        
        {/* Selected node info */}
        {selectedNode && (
          <Panel position="bottom-right">
            <Card className="p-3 max-w-sm">
              <div className="text-sm font-medium mb-2">
                {selectedNode.data.label}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Type: {selectedNode.data.type}
              </div>
              {selectedNode.data.description && (
                <div className="text-xs text-muted-foreground mb-2">
                  {selectedNode.data.description}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge 
                  variant={selectedNode.data.codeStatus === 'generated' ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {selectedNode.data.codeStatus === 'generated' ? 'Code Ready' : 'Generating...'}
                </Badge>
              </div>
            </Card>
          </Panel>
        )}
        
        <Controls />
        <MiniMap 
          style={{ 
            background: 'var(--muted)',
            border: '1px solid var(--border)'
          }}
          nodeColor={(node) => {
            const config = nodeTypeConfig[node.data?.type as keyof typeof nodeTypeConfig]
            return config?.color || '#6b7280'
          }}
        />
        <Background variant="dots" gap={16} size={1} />
      </ReactFlow>
    </div>
  )
}