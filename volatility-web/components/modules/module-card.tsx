'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Database, 
  Zap, 
  Shield, 
  GitBranch, 
  Play,
  Settings,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface Module {
  id: string
  name: string
  description: string
  category: 'data' | 'function' | 'risk' | 'strategy' | 'execution'
  version: string
  status: 'active' | 'inactive' | 'error'
  lastUpdated: string
  author: string
  dependencies: string[]
  tags: string[]
}

interface ModuleCardProps {
  module: Module
}

const categoryIcons = {
  data: Database,
  function: Zap,
  risk: Shield,
  strategy: GitBranch,
  execution: Play
}

const categoryColors = {
  data: 'text-blue-600',
  function: 'text-purple-600',
  risk: 'text-orange-600',
  strategy: 'text-green-600',
  execution: 'text-red-600'
}

export function ModuleCard({ module }: ModuleCardProps) {
  const Icon = categoryIcons[module.category]
  
  const statusConfig = {
    active: {
      color: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      label: 'Active'
    },
    inactive: {
      color: 'bg-gray-100 text-gray-800',
      icon: XCircle,
      label: 'Inactive'
    },
    error: {
      color: 'bg-red-100 text-red-800',
      icon: AlertCircle,
      label: 'Error'
    }
  }

  const { color, icon: StatusIcon, label } = statusConfig[module.status]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg bg-gray-50 ${categoryColors[module.category]}`} data-testid="category-icon">
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{module.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {label}
          </span>
          <span className="text-sm text-gray-500">v{module.version}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {module.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {tag}
            </span>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">by {module.author}</span>
            <span className="text-gray-500">
              Updated {formatDistanceToNow(new Date(module.lastUpdated))} ago
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <button className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
            Details
          </button>
          <button className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
            <Settings className="h-3 w-3 inline mr-1" />
            Configure
          </button>
        </div>
      </div>
    </div>
  )
}