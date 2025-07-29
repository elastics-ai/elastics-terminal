import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Bot, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'testing'
  lastRun?: Date
  performance?: {
    successRate: number
    avgExecutionTime: number
    totalRuns: number
  }
}

interface AgentsListProps {
  agents: Agent[]
  selectedAgent: Agent | null
  onSelectAgent: (agent: Agent) => void
}

export function AgentsList({ agents, selectedAgent, onSelectAgent }: AgentsListProps) {
  return (
    <div className="p-4 space-y-2">
      {agents.map((agent) => (
        <div
          key={agent.id}
          onClick={() => onSelectAgent(agent)}
          className={cn(
            "p-3 rounded-lg cursor-pointer transition-colors",
            "hover:bg-gray-800",
            selectedAgent?.id === agent.id
              ? "bg-gray-800 border border-gray-700"
              : "border border-transparent"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-gray-800">
              <Bot className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                <Badge
                  variant={agent.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {agent.status}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-500 truncate mb-2">
                {agent.description}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {agent.lastRun && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(agent.lastRun).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {agent.performance && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{agent.performance.successRate}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}