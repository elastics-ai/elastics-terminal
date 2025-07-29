'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  ChevronDown, 
  Filter, 
  Search,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { elasticsApi } from '@/lib/api/elastics'
import { ElasticsDataset, ElasticsMajor, ElasticsStats } from '@/types/elastics'

export function DataCatalog() {
  const [searchQuery, setSearchQuery] = useState('')
  const [datasets, setDatasets] = useState<ElasticsDataset[]>([])
  const [majors, setMajors] = useState<ElasticsMajor[]>([])
  const [stats, setStats] = useState<ElasticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all data in parallel
      const [datasetsRes, majorsRes, statsRes] = await Promise.all([
        elasticsApi.getDatasets({ search: searchQuery }),
        elasticsApi.getMajors(),
        elasticsApi.getStats()
      ])
      
      setDatasets(datasetsRes)
      setMajors(majorsRes)
      setStats(statsRes)
    } catch (err) {
      console.error('Error fetching Elastics data:', err)
      setError('Failed to load data. Using sample data.')
      
      // Use fallback data
      setDatasets([
        {
          id: 1,
          name: 'Deribiteth US Equities',
          provider: 'Deribit',
          description: 'Data from 16 US equities exchanges\nand 30 STOs make a single product',
          category: 'MBPY',
          schema: 'G009L',
          publisher: 'TSLA',
          region: 'North America',
          history: 'Since 2016',
          products: '20,948 products',
          status: 'active',
          features: { btc: true, eth: true, bnb: false, sol: true },
          issues: { critical: 3, warning: 2, info: 6 },
          highlight: true
        },
        {
          id: 2,
          name: 'OKEX',
          provider: 'OKEX',
          description: 'Consolidated real club, exchange $50\nand national BSD across 500 equity...',
          category: 'SPY',
          schema: '1002',
          publisher: 'SPY',
          region: 'North America',
          history: 'Since 2013',
          products: '7,728 products',
          status: 'active',
          features: { btc: false, eth: false, bnb: false, sol: false }
        },
        {
          id: 3,
          name: 'CME Globex MDP 3.0',
          provider: 'CME',
          description: 'All futures and options on CME, CBOT,\nNYMEX, and COMEX available globally...',
          category: 'ES',
          schema: 'GL',
          publisher: 'SPY',
          region: 'North America',
          history: 'Since 2010',
          products: '4,391 products',
          status: 'active',
          features: { btc: false, eth: false, bnb: false, sol: true }
        },
        {
          id: 4,
          name: 'ICE Europe Commodities',
          provider: 'ICE',
          description: 'Covers over 50% of global crude and\nrefined oil futures trading. From ICE\'s...',
          category: 'BRN',
          schema: 'G',
          publisher: 'WBS',
          region: 'Europe',
          history: 'Since 2016',
          products: '4,391 products',
          status: 'active',
          features: { btc: false, eth: false, bnb: false, sol: false }
        },
        {
          id: 5,
          name: 'ICE Futures US',
          provider: 'ICE',
          description: 'Major softs, metals, MSCI indices, and\nthe US Dollar Index. From ICE\'s Miami...',
          category: 'CT',
          schema: 'NR',
          publisher: 'KC',
          region: 'US',
          history: 'Since 2016',
          products: '2,649 products',
          status: 'active',
          features: { btc: false, eth: false, bnb: false, sol: false }
        }
      ])
      
      setMajors([
        {
          id: 1,
          name: 'CoinGecko Majors',
          provider: 'CoinGecko',
          description: 'Tracks top crypto market cap assets.\nPolled from CoinGecko\'s top 1-1000.',
          products: '1,521 products',
          status: 'Global',
          since: 'Since 2013',
          features: { btc: true, eth: true, bnb: true, sol: true }
        },
        {
          id: 2,
          name: 'ICE Europe Financials',
          provider: 'ICE Europe',
          description: 'Covers European equity and interest\nrate derivatives from ICE Europe.',
          products: '5,134 products',
          status: 'Europe',
          since: 'Since 2025',
          features: { btc: false, eth: false, bnb: false, sol: true }
        },
        {
          id: 3,
          name: 'ICE Endex',
          provider: 'ICE Endex',
          description: 'Leading European energy exchange for\ngas, power, and renewables.',
          products: '2,649 products',
          status: 'Europe',
          since: 'Since 2016',
          features: { btc: false, eth: false, bnb: false, sol: false }
        },
        {
          id: 4,
          name: 'ICE Futures US',
          provider: 'ICE',
          description: 'Major softs, metals, MSCI indices,\nand the US Dollar Index. From ICE\'s Miami...',
          products: '2,649 products',
          status: 'US',
          since: 'Since 2016',
          features: { btc: false, eth: false, bnb: false, sol: false }
        }
      ])
      
      setStats({
        total_datasets: 10,
        active_datasets: 8,
        total_products: 45173,
        issues: { critical: 3, warning: 2, info: 6 }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    await fetchData()
  }

  const getFeatureColor = (active: boolean) => {
    return active ? 'text-green-600' : 'text-gray-300'
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading Elastics data...</p>
        </div>
      </div>
    )
  }

  // Find the highlighted dataset
  const highlightedDataset = datasets.find(d => d.highlight) || datasets[0]
  const otherDatasets = datasets.filter(d => !d.highlight && d.id !== highlightedDataset?.id)

  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Data Catalog</h1>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>My Data</span>
            </nav>
          </div>
          {stats && (
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Critical: {stats.issues.critical}
              </Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Warning: {stats.issues.warning}
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                <Info className="w-3 h-3 mr-1" />
                Info: {stats.issues.info}
              </Badge>
              <span className="text-sm text-gray-500">09:11:43 UTC</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-2" />
            Category
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            Schema
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            Publisher
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            Region
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            Available History
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              type="search" 
              placeholder="Search" 
              className="pl-10 w-64 h-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Data Table */}
          <div className="space-y-4">
            {/* Featured Dataset Card */}
            {highlightedDataset && (
              <Card className="p-6 bg-white border-2 border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{highlightedDataset.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{highlightedDataset.provider}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Export</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                  {highlightedDataset.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{highlightedDataset.products}</span>
                  </div>
                  <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                    See More →
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Category</span>
                    <p className="font-medium mt-1">{highlightedDataset.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Schema</span>
                    <p className="font-medium mt-1">{highlightedDataset.schema}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Publisher</span>
                    <p className="font-medium mt-1">{highlightedDataset.publisher}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Region</span>
                    <p className="font-medium mt-1">{highlightedDataset.region}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">History</span>
                    <p className="font-medium mt-1">{highlightedDataset.history}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-xs font-medium">
                  <span className={getFeatureColor(highlightedDataset.features.btc)}>BTC</span>
                  <span className={getFeatureColor(highlightedDataset.features.eth)}>ETH</span>
                  <span className={getFeatureColor(highlightedDataset.features.bnb)}>BNB</span>
                  <span className={getFeatureColor(highlightedDataset.features.sol)}>SOL</span>
                </div>
              </Card>
            )}

            {/* Data Table */}
            {otherDatasets.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 text-xs font-medium text-gray-500">Historical</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500">Live</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500">included in paid plans</th>
                        <th className="text-center p-4 text-xs font-medium text-gray-500">Products</th>
                        <th className="text-center p-4 text-xs font-medium text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherDatasets.map((dataset) => (
                        <tr key={dataset.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-sm">{dataset.name}</p>
                              <p className="text-xs text-gray-500">{dataset.provider}</p>
                              <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{dataset.description}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex gap-4">
                                <span className="text-gray-500">Category:</span>
                                <span className="font-medium">{dataset.category}</span>
                              </div>
                              <div className="flex gap-4">
                                <span className="text-gray-500">Schema:</span>
                                <span className="font-medium">{dataset.schema}</span>
                              </div>
                              <div className="flex gap-4">
                                <span className="text-gray-500">Publisher:</span>
                                <span className="font-medium">{dataset.publisher}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs">
                              <Badge variant="secondary" className="mb-1">{dataset.region}</Badge>
                              <p className="text-gray-500">{dataset.history}</p>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <p className="text-sm font-medium">{dataset.products}</p>
                          </td>
                          <td className="p-4 text-center">
                            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 text-xs">
                              See More →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Majors & Additional Info */}
          <div className="space-y-6">
            {/* Majors Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {majors.map((major) => (
                <Card key={major.id} className="p-4 bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">{major.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Export</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{major.provider}</p>
                  <p className="text-xs text-gray-600 mb-3 whitespace-pre-line">{major.description}</p>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium">{major.products}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs h-5">{major.status}</Badge>
                      <Badge variant="secondary" className="text-xs h-5">{major.since}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className={getFeatureColor(major.features.btc)}>BTC</span>
                    <span className={getFeatureColor(major.features.eth)}>ETH</span>
                    <span className={getFeatureColor(major.features.bnb)}>BNB</span>
                    <span className={getFeatureColor(major.features.sol)}>SOL</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-white">
                <p className="text-xs text-gray-600 mb-2">
                  Compare B/N and GL futures contracts
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600">
                  See More →
                </Button>
              </Card>
              <Card className="p-4 bg-white">
                <p className="text-xs text-gray-600 mb-2">
                  What's included in CME MDP 3.0 futures?
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600">
                  See More →
                </Button>
              </Card>
              <Card className="p-4 bg-white">
                <p className="text-xs text-gray-600 mb-2">
                  Showcase all US options datasets
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-blue-600">
                  See More →
                </Button>
              </Card>
            </div>

            {/* Question Card */}
            <Card className="p-4 bg-white">
              <p className="text-xs text-gray-600">
                Which dataset is best for volatility equity vol modeling?
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}