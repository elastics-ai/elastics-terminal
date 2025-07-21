'use client'

import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
  NodeProps,
  getBezierPath,
  EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { MessageSquare, GitBranch, Calendar, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ConversationNode {
  id: number
  title: string
  use_case: string
  created_at: string
  message_count: number
  children?: ConversationNode[]
  parent_id?: number
}

interface ChatTreeViewProps {
  tree: ConversationNode
  selectedId?: number
  onSelect: (id: number) => void
  onBranch?: (id: number) => void
}

// Custom node component
const ConversationNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const { conversation, onSelect, isSelected, hasChildren } = data

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getUseCaseColor = (useCase: string) => {
    const colorMap: Record<string, string> = {
      portfolio_performance: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
      risk_management: 'from-red-500/20 to-red-600/20 border-red-500/50',
      market_analysis: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
      portfolio_exposure: 'from-green-500/20 to-green-600/20 border-green-500/50',
      event_driven: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50',
      options_analytics: 'from-pink-500/20 to-pink-600/20 border-pink-500/50',
      trading_strategy: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/50',
    }
    return colorMap[useCase] || 'from-gray-500/20 to-gray-600/20 border-gray-500/50'
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "relative px-4 py-3 rounded-lg border-2 cursor-pointer transition-all",
        "bg-gradient-to-br backdrop-blur-sm shadow-lg",
        getUseCaseColor(conversation.use_case),
        isSelected && "ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900"
      )}
      style={{ width: 280, minHeight: 100 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-800"
      />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <div className="relative">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
            </div>
          ) : (
            <MessageSquare className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-100 truncate max-w-[180px]">
            {conversation.title}
          </h3>
        </div>
        {conversation.parent_id && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Hash className="w-3 h-3" />
            {conversation.parent_id}
          </span>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{conversation.message_count} messages</span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(conversation.created_at)}
        </span>
      </div>

      {/* Use case badge */}
      <div className="mt-2">
        <span className={cn(
          "inline-flex px-2 py-0.5 text-xs rounded-full",
          "bg-white/10 text-gray-200"
        )}>
          {conversation.use_case.replace(/_/g, ' ')}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-gray-800"
      />
    </motion.div>
  )
}

// Custom edge component with animation
const AnimatedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: '#6366F1',
          strokeWidth: 2,
        }}
        className="react-flow__edge-path animate-pulse"
        d={edgePath}
      />
      <circle r="4" fill="#6366F1">
        <animateMotion dur="2s" repeatCount="indefinite">
          <mpath href={`#${id}`} />
        </animateMotion>
      </circle>
    </>
  )
}

export const ChatTreeView: React.FC<ChatTreeViewProps> = ({
  tree,
  selectedId,
  onSelect,
  onBranch,
}) => {
  // Convert tree structure to react-flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    let yOffset = 0

    const processNode = (
      node: ConversationNode,
      parentId: string | null = null,
      level: number = 0,
      index: number = 0,
      siblingCount: number = 1
    ) => {
      const nodeId = `node-${node.id}`
      const xPosition = 400 * index - (400 * (siblingCount - 1)) / 2
      const yPosition = level * 200

      nodes.push({
        id: nodeId,
        type: 'conversationNode',
        position: { x: xPosition, y: yPosition },
        data: {
          conversation: node,
          onSelect,
          isSelected: selectedId === node.id,
          hasChildren: node.children && node.children.length > 0,
        },
      })

      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'animatedEdge',
          animated: true,
        })
      }

      if (node.children) {
        node.children.forEach((child, childIndex) => {
          processNode(child, nodeId, level + 1, childIndex, node.children!.length)
        })
      }
    }

    processNode(tree)
    return { nodes, edges }
  }, [tree, selectedId, onSelect])

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes)
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges)

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      conversationNode: ConversationNodeComponent,
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      animatedEdge: AnimatedEdge,
    }),
    []
  )

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#374151" gap={16} />
        <Controls className="!bg-gray-800 !border-gray-700">
          <button className="react-flow__controls-button">
            <GitBranch className="w-4 h-4" />
          </button>
        </Controls>
        <MiniMap
          className="!bg-gray-800"
          nodeColor={(node) => {
            const data = node.data as any
            return data.isSelected ? '#8B5CF6' : '#4B5563'
          }}
        />
      </ReactFlow>
    </div>
  )
}