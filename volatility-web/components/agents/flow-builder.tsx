'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Node {
  id: string
  type: 'data' | 'function' | 'strategy' | 'risk' | 'execution'
  label: string
  position: { x: number; y: number }
  data?: any
}

interface Connection {
  id: string
  from: string
  to: string
}

const nodeTypes = {
  data: { color: 'bg-blue-500', icon: '📊' },
  function: { color: 'bg-purple-500', icon: '⚡' },
  strategy: { color: 'bg-green-500', icon: '📈' },
  risk: { color: 'bg-red-500', icon: '⚠️' },
  execution: { color: 'bg-gray-500', icon: '⚙️' }
}

export function AgentsFlowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      type: 'data',
      label: 'Kalshi',
      position: { x: 100, y: 100 }
    },
    {
      id: '2',
      type: 'data',
      label: 'Polymarket',
      position: { x: 350, y: 100 }
    },
    {
      id: '3',
      type: 'data',
      label: 'Deribit',
      position: { x: 600, y: 100 }
    },
    {
      id: '4',
      type: 'data',
      label: 'Twitter',
      position: { x: 850, y: 100 }
    },
    {
      id: '5',
      type: 'function',
      label: 'Contract Matcher',
      position: { x: 225, y: 250 }
    },
    {
      id: '6',
      type: 'function',
      label: 'Implied Volatility',
      position: { x: 475, y: 250 }
    },
    {
      id: '7',
      type: 'function',
      label: 'Sentiment Analysis',
      position: { x: 725, y: 250 }
    },
    {
      id: '8',
      type: 'strategy',
      label: 'Market-Making-Strategy-01',
      position: { x: 350, y: 400 }
    },
    {
      id: '9',
      type: 'risk',
      label: 'Hedging-System-01',
      position: { x: 600, y: 400 }
    },
    {
      id: '10',
      type: 'execution',
      label: 'Engine-01',
      position: { x: 475, y: 550 }
    }
  ])

  const [connections] = useState<Connection[]>([
    { id: 'c1', from: '1', to: '5' },
    { id: 'c2', from: '2', to: '5' },
    { id: 'c3', from: '3', to: '6' },
    { id: 'c4', from: '4', to: '7' },
    { id: 'c5', from: '5', to: '8' },
    { id: 'c6', from: '6', to: '8' },
    { id: 'c7', from: '6', to: '9' },
    { id: 'c8', from: '7', to: '9' },
    { id: 'c9', from: '8', to: '10' },
    { id: 'c10', from: '9', to: '10' }
  ])

  const canvasRef = useRef<SVGSVGElement>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setDraggingNode(nodeId)
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      })
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingNode) {
      setNodes(prev => prev.map(node => 
        node.id === draggingNode
          ? { ...node, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
          : node
      ))
    }
  }, [draggingNode, dragOffset])

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null)
  }, [])

  // Add event listeners
  useState(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  })

  const getNodeCenter = (node: Node) => ({
    x: node.position.x + 100,
    y: node.position.y + 40
  })

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UwZTBlMCIgb3BhY2l0eT0iMC4yIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTBlMGUwIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"
      />

      {/* Connections */}
      <svg ref={canvasRef} className="absolute inset-0 pointer-events-none">
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.from)
          const toNode = nodes.find(n => n.id === conn.to)
          if (!fromNode || !toNode) return null

          const from = getNodeCenter(fromNode)
          const to = getNodeCenter(toNode)

          return (
            <g key={conn.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <circle
                cx={to.x}
                cy={to.y}
                r="4"
                fill="#e5e7eb"
              />
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const nodeType = nodeTypes[node.type]
        return (
          <div
            key={node.id}
            className={cn(
              "absolute w-[200px] p-4 rounded-lg border-2 bg-card cursor-move select-none transition-shadow hover:shadow-lg",
              node.type === 'data' && "border-blue-200",
              node.type === 'function' && "border-purple-200",
              node.type === 'strategy' && "border-green-200",
              node.type === 'risk' && "border-red-200",
              node.type === 'execution' && "border-gray-300"
            )}
            style={{
              left: `${node.position.x}px`,
              top: `${node.position.y}px`
            }}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{nodeType.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {node.type === 'data' && 'Data Source'}
                    {node.type === 'function' && 'Function'}
                    {node.type === 'strategy' && 'Strategy'}
                    {node.type === 'risk' && 'Risk'}
                    {node.type === 'execution' && 'Execution'}
                  </span>
                </div>
                <h3 className="font-medium text-sm mt-1">{node.label}</h3>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}