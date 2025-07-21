'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronDown, MessageSquare, GitBranch, Calendar, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface ConversationNode {
  id: number
  title: string
  use_case: string
  created_at: string
  message_count: number
  children?: ConversationNode[]
  parent_id?: number
}

interface ChatHistoryTreeProps {
  tree: ConversationNode
  selectedId?: number
  onSelect: (id: number) => void
  onBranch?: (id: number, messageId: number) => void
}

const UseCaseBadge: React.FC<{ useCase: string }> = ({ useCase }) => {
  const colorMap: Record<string, string> = {
    portfolio_performance: 'bg-blue-500/20 text-blue-300',
    risk_management: 'bg-red-500/20 text-red-300',
    market_analysis: 'bg-purple-500/20 text-purple-300',
    portfolio_exposure: 'bg-green-500/20 text-green-300',
    event_driven: 'bg-yellow-500/20 text-yellow-300',
    options_analytics: 'bg-pink-500/20 text-pink-300',
    trading_strategy: 'bg-indigo-500/20 text-indigo-300',
  }

  const labelMap: Record<string, string> = {
    portfolio_performance: 'Performance',
    risk_management: 'Risk',
    market_analysis: 'Market',
    portfolio_exposure: 'Exposure',
    event_driven: 'Events',
    options_analytics: 'Options',
    trading_strategy: 'Strategy',
  }

  return (
    <span className={cn(
      'px-2 py-0.5 text-xs rounded-full',
      colorMap[useCase] || 'bg-gray-500/20 text-gray-300'
    )}>
      {labelMap[useCase] || useCase}
    </span>
  )
}

const TreeNode: React.FC<{
  node: ConversationNode
  level: number
  selectedId?: number
  onSelect: (id: number) => void
  onBranch?: (id: number, messageId: number) => void
  isLast: boolean
  parentExpanded?: boolean
}> = ({ node, level, selectedId, onSelect, onBranch, isLast, parentExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedId === node.id

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleSelect = () => {
    onSelect(node.id)
  }

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

  return (
    <div className="relative">
      {/* Connection lines */}
      {level > 0 && (
        <>
          {/* Vertical line from parent */}
          <div 
            className="absolute left-0 top-0 w-px bg-gray-700"
            style={{ 
              left: `${(level - 1) * 24 + 12}px`,
              height: isLast ? '20px' : '100%',
            }}
          />
          {/* Horizontal line to node */}
          <div 
            className="absolute top-5 h-px bg-gray-700"
            style={{ 
              left: `${(level - 1) * 24 + 12}px`,
              width: '12px',
            }}
          />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: level * 0.05 }}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
          'hover:bg-gray-800/50',
          isSelected && 'bg-primary/20 border-l-2 border-primary'
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-gray-700 rounded relative z-10"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {/* Node indicator */}
        <div className="flex-shrink-0 relative">
          {hasChildren ? (
            <div className="relative">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500 rounded-full" />
            </div>
          ) : (
            <MessageSquare className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">
              {node.title}
            </h4>
            <UseCaseBadge useCase={node.use_case} />
            {node.parent_id && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Hash className="w-3 h-3" />
                {node.parent_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span>{node.message_count} messages</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(node.created_at)}
            </span>
          </div>
        </div>

        {/* Branch count indicator */}
        {hasChildren && (
          <div className="flex items-center gap-1 text-xs text-purple-400">
            <GitBranch className="w-3 h-3" />
            {node.children!.length}
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {node.children!.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onBranch={onBranch}
                isLast={index === node.children!.length - 1}
                parentExpanded={isExpanded}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const ChatHistoryTree: React.FC<ChatHistoryTreeProps> = ({
  tree,
  selectedId,
  onSelect,
  onBranch
}) => {
  if (!tree || Object.keys(tree).length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No conversations yet</p>
      </div>
    )
  }

  // Calculate tree statistics
  const countNodes = (node: ConversationNode): number => {
    let count = 1
    if (node.children) {
      node.children.forEach(child => {
        count += countNodes(child)
      })
    }
    return count
  }

  const maxDepth = (node: ConversationNode, depth: number = 0): number => {
    if (!node.children || node.children.length === 0) return depth
    return Math.max(...node.children.map(child => maxDepth(child, depth + 1)))
  }

  const totalConversations = countNodes(tree)
  const treeDepth = maxDepth(tree)

  return (
    <div className="py-2">
      {/* Tree Statistics */}
      <div className="mb-4 px-3 py-2 bg-gray-800/30 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{totalConversations} conversations</span>
          <span>Max depth: {treeDepth}</span>
        </div>
      </div>

      {/* Tree Visualization */}
      <TreeNode
        node={tree}
        level={0}
        selectedId={selectedId}
        onSelect={onSelect}
        onBranch={onBranch}
        isLast={true}
      />
    </div>
  )
}