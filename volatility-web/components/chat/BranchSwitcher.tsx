'use client'

import React, { useState } from 'react'
import { GitBranch, ChevronDown, Check, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Branch {
  id: number
  title: string
  message_count: number
  created_at: string
  is_current?: boolean
}

interface BranchSwitcherProps {
  branches: Branch[]
  currentBranchId: number
  onCreateBranch?: () => void
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  branches,
  currentBranchId,
  onCreateBranch
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  
  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0]

  const handleSelectBranch = (branchId: number) => {
    if (branchId !== currentBranchId) {
      router.push(`/chat/${branchId}`)
    }
    setIsOpen(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "bg-gray-800 hover:bg-gray-700 border border-gray-700",
          isOpen && "ring-2 ring-purple-500"
        )}
      >
        <GitBranch className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium">{currentBranch?.title}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-80 z-50
                         bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
            >
              <div className="p-2">
                {/* Header */}
                <div className="px-3 py-2 border-b border-gray-800 mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">
                    Switch Branch
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {branches.length} branch{branches.length !== 1 ? 'es' : ''} in this conversation
                  </p>
                </div>

                {/* Branch List */}
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch.id)}
                      className={cn(
                        "w-full px-3 py-2 rounded-md text-left transition-colors",
                        "hover:bg-gray-800 group",
                        branch.id === currentBranchId && "bg-purple-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <GitBranch className={cn(
                              "w-3.5 h-3.5",
                              branch.id === currentBranchId
                                ? "text-purple-400"
                                : "text-gray-500"
                            )} />
                            <span className={cn(
                              "text-sm font-medium",
                              branch.id === currentBranchId
                                ? "text-purple-300"
                                : "text-gray-200"
                            )}>
                              {branch.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{branch.message_count} messages</span>
                            <span>{formatDate(branch.created_at)}</span>
                          </div>
                        </div>
                        {branch.id === currentBranchId && (
                          <Check className="w-4 h-4 text-purple-400 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Create Branch Button */}
                {onCreateBranch && (
                  <div className="border-t border-gray-800 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        onCreateBranch()
                      }}
                      className="w-full px-3 py-2 rounded-md text-left transition-colors
                                 hover:bg-gray-800 group flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400" />
                      <span className="text-sm text-gray-300 group-hover:text-gray-100">
                        Create new branch
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}