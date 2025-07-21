'use client'

import React from 'react'
import { MessageSquare, Clock, Tag, GitBranch, Trash2, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ChatHistoryItemProps {
  conversation: {
    id: number
    title: string
    use_case: string
    message_count: number
    last_message_at: string
    created_at: string
    parent_message_id?: number
  }
  isSelected?: boolean
  onClick: () => void
  onDelete?: () => void
  onEdit?: () => void
  onBranch?: () => void
}

export const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onDelete,
  onEdit,
  onBranch
}) => {
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const getUseCaseColor = (useCase: string) => {
    const colorMap: Record<string, string> = {
      portfolio_performance: 'text-blue-400',
      risk_management: 'text-red-400',
      market_analysis: 'text-purple-400',
      portfolio_exposure: 'text-green-400',
      event_driven: 'text-yellow-400',
      options_analytics: 'text-pink-400',
      trading_strategy: 'text-indigo-400',
    }
    return colorMap[useCase] || 'text-gray-400'
  }

  const getUseCaseLabel = (useCase: string) => {
    const labelMap: Record<string, string> = {
      portfolio_performance: 'Performance',
      risk_management: 'Risk',
      market_analysis: 'Market',
      portfolio_exposure: 'Exposure',
      event_driven: 'Events',
      options_analytics: 'Options',
      trading_strategy: 'Strategy',
    }
    return labelMap[useCase] || useCase
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.()
  }

  const handleBranch = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBranch?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'group p-4 rounded-lg cursor-pointer transition-all',
        'bg-gray-900 hover:bg-gray-800 border border-gray-800',
        isSelected && 'border-primary bg-gray-800/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-medium text-sm mb-1 truncate">
            {conversation.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {/* Use Case */}
            <span className={cn('flex items-center gap-1', getUseCaseColor(conversation.use_case))}>
              <Tag className="w-3 h-3" />
              {getUseCaseLabel(conversation.use_case)}
            </span>

            {/* Message Count */}
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {conversation.message_count}
            </span>

            {/* Last Activity */}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(conversation.last_message_at || conversation.created_at)}
            </span>

            {/* Branch Indicator */}
            {conversation.parent_message_id && (
              <span className="flex items-center gap-1 text-blue-400">
                <GitBranch className="w-3 h-3" />
                Branch
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Edit title"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onBranch && (
            <button
              onClick={handleBranch}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Branch conversation"
            >
              <GitBranch className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-900/50 text-red-400 rounded transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}