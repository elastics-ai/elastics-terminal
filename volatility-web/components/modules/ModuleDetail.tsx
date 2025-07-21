'use client'

import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { modulesAPI } from '@/lib/api'
import { 
  X, 
  Star, 
  PlayCircle, 
  Clock, 
  Database, 
  MessageSquare, 
  History,
  Edit2,
  Save,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleDetailProps {
  moduleId: number
  onClose: () => void
  onUpdate: () => void
}

export const ModuleDetail: React.FC<ModuleDetailProps> = ({ 
  moduleId, 
  onClose,
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [executionResult, setExecutionResult] = useState<any>(null)

  // Fetch module details
  const { data: module, isLoading } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => modulesAPI.getModule(moduleId),
    onSuccess: (data) => {
      setEditTitle(data.title)
      setEditDescription(data.description || '')
    }
  })

  // Fetch execution history
  const { data: executionsData } = useQuery({
    queryKey: ['module-executions', moduleId],
    queryFn: () => modulesAPI.getModuleExecutions(moduleId, 10),
    enabled: !!moduleId,
  })

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: (data: Parameters<typeof modulesAPI.updateModule>[1]) => 
      modulesAPI.updateModule(moduleId, data),
    onSuccess: () => {
      setIsEditing(false)
      onUpdate()
    },
  })

  // Execute module mutation
  const executeModuleMutation = useMutation({
    mutationFn: () => modulesAPI.executeModule(moduleId),
    onSuccess: (data) => {
      setExecutionResult(data)
    },
  })

  const executions = executionsData?.executions || []

  const handleSave = () => {
    updateModuleMutation.mutate({
      title: editTitle,
      description: editDescription,
    })
  }

  const handleToggleFavorite = () => {
    if (module) {
      updateModuleMutation.mutate({
        is_favorite: !module.is_favorite,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="w-[600px] bg-gray-900 border-l border-gray-800 p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!module) return null

  return (
    <div className="w-[600px] bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-start justify-between mb-2">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 bg-gray-800 rounded px-2 py-1 mr-2"
            />
          ) : (
            <h2 className="text-lg font-medium flex-1">{module.title}</h2>
          )}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    module.is_favorite 
                      ? 'text-yellow-500 bg-yellow-500/20' 
                      : 'hover:bg-gray-800'
                  )}
                >
                  <Star className="w-4 h-4" fill={module.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full bg-gray-800 rounded px-2 py-1 text-sm resize-none"
            rows={2}
          />
        ) : (
          module.description && (
            <p className="text-sm text-gray-500">{module.description}</p>
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="p-4 border-b border-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Executions</div>
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-gray-600" />
                <span className="text-lg">{module.execution_count}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Avg Execution Time</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-lg">{Math.round(module.avg_execution_time_ms)}ms</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Tables Used</div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-600" />
                <span className="text-sm">
                  {module.tables_used?.join(', ') || 'None'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Source</div>
              <a
                href={`/chat/${module.first_conversation_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-500 hover:text-blue-400"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Chat #{module.first_conversation_id}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* SQL Query */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">SQL Query</h3>
            <button
              onClick={() => executeModuleMutation.mutate()}
              disabled={executeModuleMutation.isLoading}
              className="flex items-center gap-2 px-3 py-1 bg-primary hover:bg-primary/90 rounded text-sm transition-colors disabled:opacity-50"
            >
              {executeModuleMutation.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <PlayCircle className="w-3 h-3" />
              )}
              Run Query
            </button>
          </div>
          <pre className="bg-gray-800 rounded p-3 text-xs overflow-x-auto">
            <code>{module.sql_query}</code>
          </pre>
        </div>

        {/* Execution Result */}
        {executionResult && (
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium mb-2">Execution Result</h3>
            {executionResult.success ? (
              <div>
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Success - {executionResult.row_count} rows in {executionResult.execution_time_ms}ms
                  </span>
                </div>
                {executionResult.data && executionResult.data.length > 0 && (
                  <div className="bg-gray-800 rounded p-3 overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {Object.keys(executionResult.data[0]).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {executionResult.data.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="border-b border-gray-700/50">
                            {Object.values(row).map((value: any, j: number) => (
                              <td key={j} className="px-2 py-1">
                                {value?.toString() || 'null'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {executionResult.data.length > 5 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Showing 5 of {executionResult.row_count} rows
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">{executionResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Execution History */}
        <div className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Execution History
          </h3>
          {executions.length === 0 ? (
            <p className="text-sm text-gray-500">No execution history</p>
          ) : (
            <div className="space-y-2">
              {executions.map((execution: any) => (
                <div
                  key={execution.id}
                  className="bg-gray-800 rounded p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'flex items-center gap-1',
                      execution.success ? 'text-green-500' : 'text-red-500'
                    )}>
                      {execution.success ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {execution.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(execution.executed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {execution.row_count} rows • {execution.execution_time_ms}ms
                    {execution.conversation_title && (
                      <span> • From: {execution.conversation_title}</span>
                    )}
                  </div>
                  {execution.error_message && (
                    <div className="text-xs text-red-400 mt-1">
                      {execution.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}