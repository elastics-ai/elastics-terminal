import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreVertical, 
  RefreshCw, 
  Settings,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DataSource {
  id: string
  name: string
  type: 'market' | 'reference' | 'custom' | 'api'
  provider: string
  status: 'active' | 'inactive' | 'error'
  lastSync: Date
  frequency: string
  dataPoints: number
  description: string
  icon: any
}

interface DataSourceCardProps {
  source: DataSource
  onConfigure: () => void
  onSync: () => void
}

export function DataSourceCard({ source, onConfigure, onSync }: DataSourceCardProps) {
  const Icon = source.icon
  
  const getStatusIcon = () => {
    switch (source.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }
  
  const getStatusColor = () => {
    switch (source.status) {
      case 'active':
        return 'default'
      case 'error':
        return 'destructive'
      case 'inactive':
        return 'secondary'
    }
  }
  
  const getTypeColor = () => {
    switch (source.type) {
      case 'market':
        return 'bg-blue-900/20 text-blue-400 border-blue-800'
      case 'reference':
        return 'bg-green-900/20 text-green-400 border-green-800'
      case 'custom':
        return 'bg-purple-900/20 text-purple-400 border-purple-800'
      case 'api':
        return 'bg-orange-900/20 text-orange-400 border-orange-800'
    }
  }

  return (
    <Card className="p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-gray-800">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">{source.name}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{source.provider}</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${getTypeColor()}`}
              >
                {source.type}
              </Badge>
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSync}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConfigure}>
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {source.description}
      </p>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusColor() as any} className="text-xs">
              {source.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Frequency</span>
          <span className="font-medium">{source.frequency}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Data Points</span>
          <span className="font-medium">
            {source.dataPoints >= 1000000 
              ? `${(source.dataPoints / 1000000).toFixed(1)}M`
              : source.dataPoints >= 1000
              ? `${(source.dataPoints / 1000).toFixed(0)}K`
              : source.dataPoints.toLocaleString()
            }
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Last Sync</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="font-medium">
              {source.lastSync.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
      
      {source.status === 'error' && (
        <div className="mt-4 p-3 rounded bg-red-900/20 border border-red-800">
          <p className="text-xs text-red-400">
            Connection failed. Check configuration.
          </p>
        </div>
      )}
    </Card>
  )
}