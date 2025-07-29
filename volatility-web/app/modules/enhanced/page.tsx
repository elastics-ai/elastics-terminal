'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, Package, Database, Zap, Shield, GitBranch, Play } from 'lucide-react'
import { ModuleCard } from '@/components/modules/module-card'

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

const categoryLabels = {
  data: 'Data Source',
  function: 'Function',
  risk: 'Risk',
  strategy: 'Strategy',
  execution: 'Execution'
}

export default function EnhancedModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/modules/list')
      if (response.ok) {
        const data = await response.json()
        setModules(data)
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || module.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const categoryStats = {
    data: modules.filter(m => m.category === 'data').length,
    function: modules.filter(m => m.category === 'function').length,
    risk: modules.filter(m => m.category === 'risk').length,
    strategy: modules.filter(m => m.category === 'strategy').length,
    execution: modules.filter(m => m.category === 'execution').length
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Package className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Modules</h1>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add Module</span>
          </button>
        </div>
        
        <div className="flex space-x-8 text-sm">
          <span className="text-gray-600">Modules: <span className="font-medium text-gray-900">{modules.length}</span></span>
          <span className="text-gray-600">Active: <span className="font-medium text-green-600">{modules.filter(m => m.status === 'active').length}</span></span>
          <span className="text-gray-600">Inactive: <span className="font-medium text-gray-500">{modules.filter(m => m.status === 'inactive').length}</span></span>
        </div>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{categoryStats.data}</span>
            </div>
            <p className="text-sm text-gray-600">Data Sources</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-6 w-6 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">{categoryStats.function}</span>
            </div>
            <p className="text-sm text-gray-600">Functions</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-6 w-6 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">{categoryStats.risk}</span>
            </div>
            <p className="text-sm text-gray-600">Risk</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <GitBranch className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">{categoryStats.strategy}</span>
            </div>
            <p className="text-sm text-gray-600">Strategy</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Play className="h-6 w-6 text-red-600" />
              <span className="text-2xl font-bold text-gray-900">{categoryStats.execution}</span>
            </div>
            <p className="text-sm text-gray-600">Execution</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filters:</span>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      )}
      
      {!loading && filteredModules.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No modules found matching your filters</p>
        </div>
      )}
    </div>
  )
}