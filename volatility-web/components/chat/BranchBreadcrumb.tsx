'use client'

import React from 'react'
import { ChevronRight, MessageSquare, GitBranch, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface BranchNode {
  id: number
  title: string
  parent_id?: number
  message_count: number
}

interface BranchBreadcrumbProps {
  path: BranchNode[]
  currentId: number
  onNavigate?: (id: number) => void
}

export const BranchBreadcrumb: React.FC<BranchBreadcrumbProps> = ({
  path,
  currentId,
  onNavigate
}) => {
  const router = useRouter()

  const handleNavigate = (node: BranchNode) => {
    if (node.id === currentId) return
    
    if (onNavigate) {
      onNavigate(node.id)
    } else {
      router.push(`/chat/${node.id}`)
    }
  }

  if (path.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-800 overflow-x-auto">
      <div className="flex items-center gap-2 text-sm">
        {/* Root indicator */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-800 
                     transition-colors text-gray-400 hover:text-gray-200"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Chat</span>
        </motion.button>

        {path.map((node, index) => (
          <React.Fragment key={node.id}>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleNavigate(node)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all",
                node.id === currentId
                  ? "bg-purple-500/20 text-purple-400 font-medium"
                  : "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              {/* Icon based on whether it has branches */}
              {node.parent_id ? (
                <GitBranch className="w-3.5 h-3.5" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5" />
              )}
              
              {/* Title */}
              <span className="max-w-[200px] truncate">{node.title}</span>
              
              {/* Message count badge */}
              {node.message_count > 0 && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 text-[10px] rounded-full",
                  node.id === currentId
                    ? "bg-purple-500/30 text-purple-300"
                    : "bg-gray-700 text-gray-400"
                )}>
                  {node.message_count}
                </span>
              )}
            </motion.button>
          </React.Fragment>
        ))}
      </div>

      {/* Branch indicator if current conversation is a branch */}
      {path.length > 1 && (
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <GitBranch className="w-3 h-3" />
          <span>Branch level: {path.length - 1}</span>
        </div>
      )}
    </div>
  )
}