'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Database, Download, Settings, Shield } from 'lucide-react'

interface DataSource {
  id: string
  name: string
  publisher: string
  region: string
  version: string
  status: 'active' | 'inactive' | 'deprecated'
  lastUpdated: string
  schema: string
  availableHistory: string
  tags: string[]
}

interface DataSourceCardProps {
  dataSource: DataSource
}

export function DataSourceCard({ dataSource }: DataSourceCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    deprecated: 'bg-red-100 text-red-800'
  }

  const statusLabels = {
    active: 'Active',
    inactive: 'Inactive',
    deprecated: 'Deprecated'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <Database className="h-8 w-8 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{dataSource.name}</h3>
            <p className="text-sm text-gray-500">by {dataSource.publisher}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[dataSource.status]}`}>
          {statusLabels[dataSource.status]}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Schema</span>
          <span className="font-medium text-gray-900">{dataSource.schema}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Region</span>
          <span className="font-medium text-gray-900">{dataSource.region}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Available History</span>
          <span className="font-medium text-gray-900">{dataSource.availableHistory}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Version</span>
          <span className="font-medium text-gray-900">v{dataSource.version}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-2 mb-4">
          {dataSource.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Updated {formatDistanceToNow(new Date(dataSource.lastUpdated))} ago
          </p>
          
          <div className="flex items-center space-x-2">
            <button className="p-1 hover:bg-gray-100 rounded" title="Download">
              <Download className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded" title="Settings">
              <Settings className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded" title="Permissions">
              <Shield className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}