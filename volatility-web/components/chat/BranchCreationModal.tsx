'use client'

import React, { useState } from 'react'
import { X, GitBranch, MessageSquare, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BranchCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string, description?: string) => void
  parentMessage: {
    id: number
    content: string
    role: 'user' | 'assistant'
    timestamp: Date
  }
  currentConversationTitle: string
}

export const BranchCreationModal: React.FC<BranchCreationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  parentMessage,
  currentConversationTitle
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    
    setIsCreating(true)
    await onConfirm(title.trim(), description.trim())
    setIsCreating(false)
    
    // Reset form
    setTitle('')
    setDescription('')
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl 
                       bg-gray-900 rounded-xl shadow-2xl border border-gray-800 z-50"
          >
            {/* Header */}
            <div className="border-b border-gray-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <GitBranch className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Create Branch</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Visual representation of the branch */}
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="text-sm text-gray-400">Branching from:</div>
                
                {/* Current conversation */}
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{currentConversationTitle}</div>
                    <div className="text-xs text-gray-500">Current conversation</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center gap-2 pl-8">
                  <div className="w-px h-8 bg-gray-700" />
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                </div>

                {/* Parent message preview */}
                <div className="flex items-start gap-3 bg-gray-800 rounded-lg p-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    parentMessage.role === 'user' 
                      ? "bg-blue-500/20 text-blue-400" 
                      : "bg-green-500/20 text-green-400"
                  )}>
                    {parentMessage.role === 'user' ? 'U' : 'A'}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {parentMessage.role === 'user' ? 'Your message' : 'Assistant message'}
                    </div>
                    <p className="text-sm text-gray-300">
                      {truncateContent(parentMessage.content)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Branch Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Alternative approach, Follow-up questions"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             placeholder-gray-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes about why you're creating this branch..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             placeholder-gray-500 resize-none"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GitBranch className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p>This will create a new conversation branch starting from the selected message.</p>
                    <p className="mt-1">You can switch between branches at any time from the chat history.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white
                           transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isCreating}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg
                           hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      Create Branch
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}