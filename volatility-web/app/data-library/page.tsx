'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { useState } from "react"
import { Search, Filter, Download, ChevronDown, FileText, Database, TrendingUp, Calendar } from "lucide-react"

interface DataItem {
  id: string
  name: string
  type: 'market' | 'economic' | 'alternative' | 'reference'
  description: string
  frequency: string
  lastUpdated: string
  size: string
  format: string
  provider: string
}

const dataItems: DataItem[] = [
  {
    id: '1',
    name: 'S&P 500 Historical Prices',
    type: 'market',
    description: 'Daily price data for S&P 500 index including open, high, low, close, and volume',
    frequency: 'Daily',
    lastUpdated: '2024-01-15',
    size: '145 MB',
    format: 'CSV',
    provider: 'Yahoo Finance'
  },
  {
    id: '2',
    name: 'US GDP Quarterly Data',
    type: 'economic',
    description: 'Quarterly gross domestic product data for the United States',
    frequency: 'Quarterly',
    lastUpdated: '2024-01-10',
    size: '12 MB',
    format: 'JSON',
    provider: 'FRED'
  },
  {
    id: '3',
    name: 'Crypto Market Cap Data',
    type: 'alternative',
    description: 'Market capitalization data for top 100 cryptocurrencies',
    frequency: 'Hourly',
    lastUpdated: '2024-01-15',
    size: '89 MB',
    format: 'CSV',
    provider: 'CoinGecko'
  },
  {
    id: '4',
    name: 'Exchange Rate Historical',
    type: 'reference',
    description: 'Historical exchange rates for major currency pairs',
    frequency: 'Daily',
    lastUpdated: '2024-01-14',
    size: '234 MB',
    format: 'CSV',
    provider: 'ECB'
  }
]

const typeIcons = {
  market: TrendingUp,
  economic: Database,
  alternative: FileText,
  reference: Calendar
}

const typeColors = {
  market: 'text-blue-600 bg-blue-50',
  economic: 'text-green-600 bg-green-50',
  alternative: 'text-purple-600 bg-purple-50',
  reference: 'text-orange-600 bg-orange-50'
}

export default function DataLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all')

  const filteredData = dataItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesFrequency = selectedFrequency === 'all' || item.frequency === selectedFrequency
    
    return matchesSearch && matchesType && matchesFrequency
  })

  return (
    <AppLayout>
      <div className="flex-1 bg-gray-50 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">7. Data Library</h1>
            <p className="text-gray-600">Access and download market data, economic indicators, and alternative datasets</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search datasets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--elastics-green))] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--elastics-green))] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="market">Market Data</option>
                  <option value="economic">Economic Data</option>
                  <option value="alternative">Alternative Data</option>
                  <option value="reference">Reference Data</option>
                </select>
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              {/* Frequency Filter */}
              <div className="relative">
                <select
                  value={selectedFrequency}
                  onChange={(e) => setSelectedFrequency(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--elastics-green))] focus:border-transparent"
                >
                  <option value="all">All Frequencies</option>
                  <option value="Daily">Daily</option>
                  <option value="Hourly">Hourly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredData.map((item) => {
              const Icon = typeIcons[item.type]
              const colorClass = typeColors[item.type]
              
              return (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Provider</p>
                      <p className="text-sm font-medium text-gray-900">{item.provider}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Frequency</p>
                      <p className="text-sm font-medium text-gray-900">{item.frequency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">{item.lastUpdated}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-sm font-medium text-gray-900">{item.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Format: {item.format}</span>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--elastics-green))] text-white rounded-md hover:bg-[hsl(var(--elastics-green))]/90 transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Download</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}