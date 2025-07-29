'use client'

<<<<<<< HEAD
import React, { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataSourceCard } from '@/components/data/data-source-card'
import { 
  Database, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Server,
  Cloud,
  FileText,
  BarChart3
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  type: 'market' | 'reference' | 'custom' | 'api'
  provider: string
  status: 'active' | 'inactive' | 'error'
  lastSync: Date
  frequency: string
  dataPoints: number
  description: string
  icon: any
=======
'use client'

import React, { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataSourceCard } from '@/components/data/data-source-card'
import { 
  Database, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Server,
  Cloud,
  FileText,
  BarChart3
} from 'lucide-react'

interface DataSource {
  id: string
  name: string
  type: 'market' | 'reference' | 'custom' | 'api'
  provider: string
  status: 'active' | 'inactive' | 'error'
  lastSync: Date
  frequency: string
  dataPoints: number
  description: string
  icon: any
}

export default function DataLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Mock data sources
  const dataSources: DataSource[] = [
    {
      id: '1',
      name: 'Options Chain Data',
      type: 'market',
      provider: 'Deribit',
      status: 'active',
      lastSync: new Date('2024-01-15T12:00:00'),
      frequency: 'Real-time',
      dataPoints: 1250000,
      description: 'Live options chain data including bid/ask, volume, and open interest',
      icon: TrendingUp
    },
    {
      id: '2',
      name: 'Historical Volatility',
      type: 'reference',
      provider: 'Internal',
      status: 'active',
      lastSync: new Date('2024-01-15T11:45:00'),
      frequency: '15 min',
      dataPoints: 850000,
      description: 'Calculated historical volatility for major indices and ETFs',
      icon: Activity
    },
    {
      id: '3',
      name: 'Market Indices',
      type: 'market',
      provider: 'Bloomberg',
      status: 'active',
      lastSync: new Date('2024-01-15T12:05:00'),
      frequency: '1 min',
      dataPoints: 2500000,
      description: 'Real-time index values for SPX, NDX, RUT, and more',
      icon: BarChart3
    },
    {
      id: '4',
      name: 'Custom Greeks Model',
      type: 'custom',
      provider: 'Elastics Options',
      status: 'active',
      lastSync: new Date('2024-01-15T10:30:00'),
      frequency: 'On-demand',
      dataPoints: 125000,
      description: 'Proprietary Greeks calculations using SSVI model',
      icon: FileText
    },
    {
      id: '5',
      name: 'Economic Calendar',
      type: 'reference',
      provider: 'Federal Reserve',
      status: 'error',
      lastSync: new Date('2024-01-14T08:00:00'),
      frequency: 'Daily',
      dataPoints: 15000,
      description: 'Economic events and indicators affecting market volatility',
      icon: Clock
    },
    {
      id: '6',
      name: 'Cloud Backup',
      type: 'api',
      provider: 'AWS S3',
      status: 'inactive',
      lastSync: new Date('2024-01-10T00:00:00'),
      frequency: 'Weekly',
      dataPoints: 5000000,
      description: 'Historical data backup and recovery service',
      icon: Cloud
    }
  ]

  const filteredSources = dataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         source.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         source.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = selectedType === 'all' || source.type === selectedType
    const matchesStatus = selectedStatus === 'all' || source.status === selectedStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const stats = {
    totalSources: dataSources.length,
    activeSources: dataSources.filter(s => s.status === 'active').length,
    totalDataPoints: dataSources.reduce((sum, s) => sum + s.dataPoints, 0),
    lastUpdate: new Date('2024-01-15T12:05:00')
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal mb-1">Data Library</h1>
            <p className="text-gray-500">Manage and monitor all data sources</p>
          </div>
          
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Data Source
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Sources</span>
              <Database className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">{stats.totalSources}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Active Sources</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-medium">{stats.activeSources}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Data Points</span>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">{(stats.totalDataPoints / 1000000).toFixed(1)}M</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Last Update</span>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-sm font-medium">
              {stats.lastUpdate.toLocaleTimeString()}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog">Data Catalog</TabsTrigger>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search data sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="market">Market Data</SelectItem>
                  <SelectItem value="reference">Reference Data</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Data Sources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSources.map((source) => (
                <DataSourceCard
                  key={source.id}
                  source={source}
                  onConfigure={() => console.log('Configure', source.id)}
                  onSync={() => console.log('Sync', source.id)}
                />
              ))}
            </div>
            
            {filteredSources.length === 0 && (
              <Card className="p-8 text-center">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No data sources found</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Data Pipelines</h3>
              <p className="text-gray-500">Configure ETL pipelines and data transformations</p>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Data Quality Monitoring</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Completeness</div>
                    <div className="text-sm text-gray-500">Missing data points</div>
                  </div>
                  <Badge variant="default">98.5%</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Accuracy</div>
                    <div className="text-sm text-gray-500">Data validation errors</div>
                  </div>
                  <Badge variant="default">99.2%</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Timeliness</div>
                    <div className="text-sm text-gray-500">Average delay</div>
                  </div>
                  <Badge variant="secondary">45ms</Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">Consistency</div>
                    <div className="text-sm text-gray-500">Cross-source validation</div>
                  </div>
                  <Badge variant="default">99.8%</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Usage Analytics</h3>
              <p className="text-gray-500">Track data consumption and API usage metrics</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
>>>>>>> 1ed33b3132e4de95515b35dd244cd8451ac0ac1d
}

export default function DataLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
<<<<<<< HEAD
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Mock data sources
  const dataSources: DataSource[] = [
    {
      id: '1',
      name: 'Options Chain Data',
      type: 'market',
      provider: 'Deribit',
      status: 'active',
      lastSync: new Date('2024-01-15T12:00:00'),
      frequency: 'Real-time',
      dataPoints: 1250000,
      description: 'Live options chain data including bid/ask, volume, and open interest',
      icon: TrendingUp
    },
    {
      id: '2',
      name: 'Historical Volatility',
      type: 'reference',
      provider: 'Internal',
      status: 'active',
      lastSync: new Date('2024-01-15T11:45:00'),
      frequency: '15 min',
      dataPoints: 850000,
      description: 'Calculated historical volatility for major indices and ETFs',
      icon: Activity
    },
    {
      id: '3',
      name: 'Market Indices',
      type: 'market',
      provider: 'Bloomberg',
      status: 'active',
      lastSync: new Date('2024-01-15T12:05:00'),
      frequency: '1 min',
      dataPoints: 2500000,
      description: 'Real-time index values for SPX, NDX, RUT, and more',
      icon: BarChart3
    },
    {
      id: '4',
      name: 'Custom Greeks Model',
      type: 'custom',
      provider: 'Elastics Options',
      status: 'active',
      lastSync: new Date('2024-01-15T10:30:00'),
      frequency: 'On-demand',
      dataPoints: 125000,
      description: 'Proprietary Greeks calculations using SSVI model',
      icon: FileText
    },
    {
      id: '5',
      name: 'Economic Calendar',
      type: 'reference',
      provider: 'Federal Reserve',
      status: 'error',
      lastSync: new Date('2024-01-14T08:00:00'),
      frequency: 'Daily',
      dataPoints: 15000,
      description: 'Economic events and indicators affecting market volatility',
      icon: Clock
    },
    {
      id: '6',
      name: 'Cloud Backup',
      type: 'api',
      provider: 'AWS S3',
      status: 'inactive',
      lastSync: new Date('2024-01-10T00:00:00'),
      frequency: 'Weekly',
      dataPoints: 5000000,
      description: 'Historical data backup and recovery service',
      icon: Cloud
    }
  ]

  const filteredSources = dataSources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         source.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         source.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = selectedType === 'all' || source.type === selectedType
    const matchesStatus = selectedStatus === 'all' || source.status === selectedStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  const stats = {
    totalSources: dataSources.length,
    activeSources: dataSources.filter(s => s.status === 'active').length,
    totalDataPoints: dataSources.reduce((sum, s) => sum + s.dataPoints, 0),
    lastUpdate: new Date('2024-01-15T12:05:00')
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-normal mb-1">Data Library</h1>
            <p className="text-gray-500">Manage and monitor all data sources</p>
          </div>
          
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Data Source
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Sources</span>
              <Database className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">{stats.totalSources}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Active Sources</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-medium">{stats.activeSources}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Data Points</span>
              <BarChart3 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-2xl font-medium">{(stats.totalDataPoints / 1000000).toFixed(1)}M</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Last Update</span>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-sm font-medium">
              {stats.lastUpdate.toLocaleTimeString()}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList>
            <TabsTrigger value="catalog">Data Catalog</TabsTrigger>
            <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search data sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="market">Market Data</SelectItem>
                  <SelectItem value="reference">Reference Data</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Data Sources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSources.map((source) => (
                <DataSourceCard
                  key={source.id}
                  source={source}
                  onConfigure={() => console.log('Configure', source.id)}
                  onSync={() => console.log('Sync', source.id)}
                />
              ))}
            </div>
            
            {filteredSources.length === 0 && (
              <Card className="p-8 text-center">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No data sources found</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Data Pipelines</h3>
              <p className="text-gray-500">Configure ETL pipelines and data transformations</p>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Data Quality Monitoring</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Completeness</div>
                    <div className="text-sm text-gray-500">Missing data points</div>
                  </div>
                  <Badge variant="default">98.5%</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Accuracy</div>
                    <div className="text-sm text-gray-500">Data validation errors</div>
                  </div>
                  <Badge variant="default">99.2%</Badge>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <div className="font-medium">Timeliness</div>
                    <div className="text-sm text-gray-500">Average delay</div>
                  </div>
                  <Badge variant="secondary">45ms</Badge>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">Consistency</div>
                    <div className="text-sm text-gray-500">Cross-source validation</div>
                  </div>
                  <Badge variant="default">99.8%</Badge>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Usage Analytics</h3>
              <p className="text-gray-500">Track data consumption and API usage metrics</p>
            </Card>
          </TabsContent>
        </Tabs>
=======
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
>>>>>>> 1ed33b3132e4de95515b35dd244cd8451ac0ac1d
      </div>
    </AppLayout>
  )
}