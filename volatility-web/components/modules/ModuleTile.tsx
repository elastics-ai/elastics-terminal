'use client'

import React from 'react'
import { Star, Clock, Database, PlayCircle, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleTileProps {
  module: {
    id: number
    title: string
    description: string | null
    query_type: string
    tables_used: string[] | null
    execution_count: number
    avg_execution_time_ms: number
    last_executed_at: string
    is_favorite: boolean
    first_conversation_id: number
  }
  onClick: () => void
  onToggleFavorite: () => void
}

export const ModuleTile: React.FC<ModuleTileProps> = ({ 
  module, 
  onClick, 
  onToggleFavorite 
}) => {
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

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'SELECT': return 'bg-blue-500/20 text-blue-400'
      case 'INSERT': return 'bg-green-500/20 text-green-400'
      case 'UPDATE': return 'bg-yellow-500/20 text-yellow-400'
      case 'DELETE': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div 
      className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 cursor-pointer transition-all border border-gray-800 hover:border-gray-700 group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium mb-1 line-clamp-2">{module.title}</h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full',
              getQueryTypeColor(module.query_type)
            )}>
              {module.query_type}
            </span>
            {module.tables_used && module.tables_used.length > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Database className="w-3 h-3" />
                {module.tables_used.slice(0, 2).join(', ')}
                {module.tables_used.length > 2 && ` +${module.tables_used.length - 2}`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            module.is_favorite 
              ? 'text-yellow-500 bg-yellow-500/20' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
          )}
        >
          <Star className="w-4 h-4" fill={module.is_favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Description */}
      {module.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {module.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-500">
          <PlayCircle className="w-3 h-3" />
          <span>{module.execution_count} runs</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{Math.round(module.avg_execution_time_ms)}ms</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <MessageSquare className="w-3 h-3" />
          <span>Chat #{module.first_conversation_id}</span>
        </div>
      </div>

      {/* Last Run */}
      <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
        Last run: {formatDate(module.last_executed_at)}
      </div>
    </div>
  )
}