import React from 'react'
import { Database, GitBranch, Zap, Shield, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeProps {
  data: {
    label: string
    fields?: string[]
  }
  selected?: boolean
}

export const DataSourceNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border-2 border-blue-500 rounded-lg p-4 min-w-[200px] transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
          <Database className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-400">Data Source</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      {data.fields && (
        <div className="mt-2 space-y-1">
          {data.fields.map((field, index) => (
            <div key={index} className="text-xs text-gray-400 pl-2">
              • {field}
            </div>
          ))}
        </div>
      )}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0a0a0a]" />
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  )
}

export const FunctionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border-2 border-purple-500 rounded-lg p-4 min-w-[200px] transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-400">Function</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      {data.fields && (
        <div className="mt-2 space-y-1">
          {data.fields.map((field, index) => (
            <div key={index} className="text-xs text-gray-400 pl-2">
              • {field}
            </div>
          ))}
        </div>
      )}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-[#0a0a0a]" />
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-500 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  )
}

export const StrategyNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border-2 border-green-500 rounded-lg p-4 min-w-[220px] transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-400">Strategy</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      {data.fields && (
        <div className="mt-2 space-y-1">
          {data.fields.map((field, index) => (
            <div key={index} className="text-xs text-gray-400 pl-2">
              • {field}
            </div>
          ))}
        </div>
      )}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  )
}

export const RiskNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border-2 border-red-500 rounded-lg p-4 min-w-[200px] transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-400">Risk</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      {data.fields && (
        <div className="mt-2 space-y-1">
          {data.fields.map((field, index) => (
            <div key={index} className="text-xs text-gray-400 pl-2">
              • {field}
            </div>
          ))}
        </div>
      )}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  )
}

export const ExecutionNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border-2 border-gray-500 rounded-lg p-4 min-w-[180px] transition-all",
      selected && "ring-2 ring-primary"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center">
          <Play className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-medium text-gray-400">Execution</span>
      </div>
      <div className="text-sm font-semibold text-white">{data.label}</div>
      {data.fields && (
        <div className="mt-2 space-y-1">
          {data.fields.map((field, index) => (
            <div key={index} className="text-xs text-gray-400 pl-2">
              • {field}
            </div>
          ))}
        </div>
      )}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-500 rounded-full border-2 border-[#0a0a0a]" />
    </div>
  )
}