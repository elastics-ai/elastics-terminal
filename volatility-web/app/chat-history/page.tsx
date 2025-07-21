'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { ChatHistoryTree } from '@/components/chat/ChatHistoryTree'
import { ChatHistorySearch } from '@/components/chat/ChatHistorySearch'
import { ChatHistoryItem } from '@/components/chat/ChatHistoryItem'
import { ConversationViewer } from '@/components/chat/ConversationViewer'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatAPI } from '@/lib/api'
import { Loader2, MessageSquare } from 'lucide-react'

interface SearchFilters {
  useCase?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export default function ChatHistoryPage() {
  const queryClient = useQueryClient()
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')

  // Fetch conversations list
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations', searchQuery, filters],
    queryFn: () => chatAPI.getConversations({
      search: searchQuery || undefined,
      use_case: filters.useCase,
      // Note: You'll need to implement date filtering in the API
    }),
  })

  // Fetch selected conversation messages
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['conversation-messages', selectedConversationId],
    queryFn: () => selectedConversationId 
      ? chatAPI.getConversationMessages(selectedConversationId)
      : Promise.resolve({ messages: [] }),
    enabled: !!selectedConversationId,
  })

  // Fetch conversation tree (for tree view)
  const { data: treeData } = useQuery({
    queryKey: ['conversation-tree', selectedConversationId],
    queryFn: () => selectedConversationId
      ? chatAPI.getConversationTree(selectedConversationId)
      : Promise.resolve({ tree: {} }),
    enabled: !!selectedConversationId && viewMode === 'tree',
  })

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => chatAPI.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (selectedConversationId === deletedId) {
        setSelectedConversationId(null)
      }
    },
  })

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => 
      chatAPI.updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: number; messageId: number }) =>
      chatAPI.createConversationBranch(conversationId, { parent_message_id: messageId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedConversationId(data.conversation_id)
    },
  })

  const conversations = conversationsData?.conversations || []
  const messages = messagesData?.messages || []
  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  const handleConversationSelect = (id: number) => {
    setSelectedConversationId(id)
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationMutation.mutate(id)
    }
  }

  const handleEdit = (id: number) => {
    const conversation = conversations.find(c => c.id === id)
    if (!conversation) return

    const newTitle = prompt('Enter new title:', conversation.title)
    if (newTitle && newTitle !== conversation.title) {
      updateConversationMutation.mutate({ id, title: newTitle })
    }
  }

  const handleBranchFrom = (messageId: number) => {
    if (!selectedConversationId) return
    createBranchMutation.mutate({ 
      conversationId: selectedConversationId, 
      messageId 
    })
  }

  return (
    <AppLayout>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Panel - Search and List/Tree */}
        <div className="w-96 border-r border-gray-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-normal mb-4">Chat History</h1>
            
            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-gray-900 rounded-lg mb-4">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'tree' 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tree View
              </button>
            </div>

            {/* Search */}
            <ChatHistorySearch
              onSearch={setSearchQuery}
              onFilterChange={setFilters}
            />
          </div>

          {/* Conversations List/Tree */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <ChatHistoryItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversationId === conversation.id}
                      onClick={() => handleConversationSelect(conversation.id)}
                      onDelete={() => handleDelete(conversation.id)}
                      onEdit={() => handleEdit(conversation.id)}
                    />
                  ))
                )}
              </div>
            ) : (
              treeData?.tree && (
                <ChatHistoryTree
                  tree={treeData.tree}
                  selectedId={selectedConversationId || undefined}
                  onSelect={handleConversationSelect}
                />
              )
            )}
          </div>
        </div>

        {/* Right Panel - Conversation Viewer */}
        <div className="flex-1">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <ConversationViewer
              conversationId={selectedConversationId || undefined}
              messages={messages}
              title={selectedConversation?.title || ''}
              useCase={selectedConversation?.use_case || ''}
              onBranchFrom={handleBranchFrom}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}