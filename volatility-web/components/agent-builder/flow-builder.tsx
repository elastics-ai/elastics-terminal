import React, { useCallback, useState } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Database, 
  TrendingUp, 
  GitBranch, 
  Calculator,
  Send,
  Timer,
  Filter,
  AlertCircle,
  Plus
} from 'lucide-react'

interface FlowBuilderProps {
  agent: any
  isNew: boolean
}

const nodeTypes = {
  dataSource: {
    icon: Database,
    label: 'Data Source',
    description: 'Connect to market data'
  },
  calculator: {
    icon: Calculator,
    label: 'Calculate',
    description: 'Perform calculations'
  },
  condition: {
    icon: GitBranch,
    label: 'Condition',
    description: 'If/then logic'
  },
  filter: {
    icon: Filter,
    label: 'Filter',
    description: 'Filter data'
  },
  action: {
    icon: Send,
    label: 'Action',
    description: 'Execute trades'
  },
  timer: {
    icon: Timer,
    label: 'Timer',
    description: 'Schedule or delay'
  },
  alert: {
    icon: AlertCircle,
    label: 'Alert',
    description: 'Send notifications'
  }
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start' },
    position: { x: 250, y: 0 },
  },
]

const initialEdges: Edge[] = []

export function FlowBuilder({ agent, isNew }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: 'default',
      data: { 
        label: nodeTypes[type as keyof typeof nodeTypes].label,
        type: type
      },
      position: { 
        x: 250 + Math.random() * 100, 
        y: 100 + Math.random() * 100 
      },
      style: {
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        color: '#e5e7eb',
        padding: '10px',
      }
    }
    setNodes((nds) => nds.concat(newNode))
  }

  const CustomNode = ({ data }: { data: any }) => {
    const NodeIcon = nodeTypes[data.type as keyof typeof nodeTypes]?.icon || Database
    return (
      <div className="flex items-center gap-2">
        <NodeIcon className="w-4 h-4" />
        <span>{data.label}</span>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left sidebar with node types */}
      <div className="w-64 border-r border-border p-4">
        <h3 className="text-sm font-medium mb-4">Node Types</h3>
        <div className="space-y-2">
          {Object.entries(nodeTypes).map(([type, config]) => {
            const Icon = config.icon
            return (
              <Card
                key={type}
                className="p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => addNode(type)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-gray-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{config.label}</div>
                    <div className="text-xs text-gray-500">{config.description}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Flow canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ background: '#0f1419' }}
        >
          <Panel position="top-left">
            <Card className="p-2">
              <div className="text-sm font-medium">
                {isNew ? 'New Agent Flow' : agent?.name || 'Agent Flow'}
              </div>
            </Card>
          </Panel>
          
          <Panel position="top-right">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Validate
              </Button>
              <Button size="sm">
                Generate Code
              </Button>
            </div>
          </Panel>
          
          <Controls />
          <MiniMap 
            style={{ 
              background: '#1f2937',
              border: '1px solid #374151'
            }}
            nodeColor="#374151"
          />
          <Background variant="dots" gap={16} size={1} color="#374151" />
        </ReactFlow>
      </div>

      {/* Right sidebar for node properties */}
      <div className="w-80 border-l border-border p-4">
        <h3 className="text-sm font-medium mb-4">Properties</h3>
        <div className="text-sm text-gray-500">
          Select a node to view its properties
        </div>
      </div>
    </div>
  )
}