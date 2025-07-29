'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, Database } from 'lucide-react'
import { DataSourceCard } from '@/components/data/data-source-card'

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

export default function DataLibraryPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSchema, setSelectedSchema] = useState<string>('all')
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDataSources()
  }, [])

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data/sources')
      if (response.ok) {
        const data = await response.json()
        setDataSources(data)
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDataSources = dataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesSchema = selectedSchema === 'all' || source.schema === selectedSchema
    const matchesPublisher = selectedPublisher === 'all' || source.publisher === selectedPublisher
    const matchesRegion = selectedRegion === 'all' || source.region === selectedRegion
    
    return matchesSearch && matchesSchema && matchesPublisher && matchesRegion
  })

  const schemas = ['all', ...Array.from(new Set(dataSources.map(d => d.schema)))]
  const publishers = ['all', ...Array.from(new Set(dataSources.map(d => d.publisher)))]
  const regions = ['all', ...Array.from(new Set(dataSources.map(d => d.region)))]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Data Library</h1>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add Data Source</span>
          </button>
        </div>
        
        <p className="text-gray-600">Manage and explore available data sources for your trading strategies</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search data sources..."
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
            value={selectedSchema}
            onChange={(e) => setSelectedSchema(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {schemas.map(schema => (
              <option key={schema} value={schema}>
                {schema === 'all' ? 'All Schemas' : schema}
              </option>
            ))}
          </select>
          
          <select
            value={selectedPublisher}
            onChange={(e) => setSelectedPublisher(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {publishers.map(publisher => (
              <option key={publisher} value={publisher}>
                {publisher === 'all' ? 'All Publishers' : publisher}
              </option>
            ))}
          </select>
          
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDataSources.map((source) => (
            <DataSourceCard key={source.id} dataSource={source} />
          ))}
        </div>
      )}
      
      {!loading && filteredDataSources.length === 0 && (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No data sources found matching your filters</p>
        </div>
      )}
    </div>
  )
}