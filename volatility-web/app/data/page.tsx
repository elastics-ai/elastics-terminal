'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  ChevronDown, 
  Filter, 
  Search,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Sample data matching the design
const dataItems = [
  {
    id: 1,
    name: "Deribiteth US Equities",
    category: "MSFT",
    schema: "US",
    publisher: "Deribit",
    region: "North America",
    history: "Since 2016",
    status: "active",
    lastUpdate: "20.948 products",
    provider: "Microsoft",
    tags: ["Applied", "Inc. Class A", "Common Stock", "EQC ETF"],
    features: {
      btc: true,
      eth: true,
      bnb: false,
      sol: true
    }
  },
  {
    id: 2,
    name: "OKRA",
    category: "SPY",
    schema: "OGG",
    publisher: "North America",
    region: "Since 2013",
    history: "Since 2013",
    status: "active",
    lastUpdate: "7,768 products",
    provider: "Investor",
    tags: ["S&P 500", "1093 Index", "CBOE", "Volatility Index"],
    features: {
      btc: false,
      eth: false,
      bnb: false,
      sol: false
    }
  },
  {
    id: 3,
    name: "CME Globex MDP 3.0",
    category: "ES",
    schema: "GL",
    publisher: "CME",
    region: "North America",
    history: "Since 2010",
    status: "active",
    lastUpdate: "7,768 products",
    provider: "Green",
    tags: ["S&P", "500 ETF", "Index"],
    features: {
      btc: false,
      eth: false,
      bnb: false,
      sol: true
    }
  },
  {
    id: 4,
    name: "ICE Europe Commodities",
    category: "BRN",
    schema: "G",
    publisher: "UK",
    region: "Europe",
    history: "Since 2013",
    status: "active",
    lastUpdate: "4,091 products",
    provider: "Brent Crude",
    tags: ["IPE Brent", "Crude Futures"],
    features: {
      btc: false,
      eth: false,
      bnb: false,
      sol: false
    }
  },
  {
    id: 5,
    name: "ICE Futures US",
    category: "CT",
    schema: "NR",
    publisher: "NY",
    region: "North America",
    history: "Since 2016",
    status: "active",
    lastUpdate: "2,649 products",
    provider: "Cotton No.2",
    tags: ["Cotton", "Futures"],
    features: {
      btc: false,
      eth: false,
      bnb: false,
      sol: false
    }
  }
]

// Metrics data for the cards
const metrics = [
  { 
    label: "CoinGecko Majors", 
    provider: "CoinGecko", 
    description: "Tracks top crypto market cap assets.\nPolled from CoinGecko's top 1-1000.\nCrypto.", 
    products: "1,521 products",
    status: "Global",
    since: "Since 2013",
    features: { btc: true, eth: true, bnb: true, sol: true }
  },
  { 
    label: "ICE Europe Financials", 
    provider: "ICE Europe", 
    description: "Covers European equity and interest\nrate derivatives, including all futures\ncontracts and index options.", 
    products: "5,134 products",
    status: "Europe",
    since: "Since 2025",
    features: { btc: false, eth: false, bnb: false, sol: true }
  },
  { 
    label: "ICE Endex", 
    provider: "ICE Endex Derivatives", 
    description: "Leading European energy exchange for\ngas, power, and renewable derivatives\nfor continental...", 
    products: "2,649 products",
    status: "Europe",
    since: "Since 2016",
    features: { btc: false, eth: false, bnb: false, sol: false }
  },
  { 
    label: "TPM", 
    provider: "TPM", 
    description: "Tracks top crypto market cap assets.\nPolled from CoinGecko's top 1-1000.\nCrypto.", 
    products: "1,521 products",
    status: "Global",
    since: "Since 2013",
    features: { btc: false, eth: false, bnb: false, sol: false }
  }
]

export default function DataPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSchema, setSelectedSchema] = useState("all")
  const [selectedPublisher, setSelectedPublisher] = useState("all")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
      case 'inactive':
        return <XCircle className="w-4 h-4 text-[hsl(var(--destructive))]" />
      case 'pending':
        return <Clock className="w-4 h-4 text-[hsl(var(--warning))]" />
      default:
        return <AlertCircle className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
    }
  }

  const getFeatureColor = (active: boolean) => {
    return active ? 'text-[hsl(var(--elastics-green))]' : 'text-[hsl(var(--muted-foreground))]/30'
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Data</h1>
              <nav className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mt-1">
                <span>Data Catalog</span>
                <span>/</span>
                <span className="text-[hsl(var(--foreground))]">My Data</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Category
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Schema
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Publisher
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Region
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="sm">
                Available History
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <Input 
                  type="search" 
                  placeholder="Search" 
                  className="pl-10 w-64" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-[hsl(var(--card))] rounded-lg p-4 border border-[hsl(var(--border))]">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{metric.label}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Export</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{metric.provider}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 whitespace-pre-line">{metric.description}</p>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium">{metric.products}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs h-5">{metric.status}</Badge>
                    <Badge variant="secondary" className="text-xs h-5">{metric.since}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={getFeatureColor(metric.features.btc)}>BTC</span>
                  <span className={getFeatureColor(metric.features.eth)}>ETH</span>
                  <span className={getFeatureColor(metric.features.bnb)}>BNB</span>
                  <span className={getFeatureColor(metric.features.sol)}>SOL</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] h-full flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Schema</th>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Publisher</th>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Available History</th>
                    <th className="text-center py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Features</th>
                    <th className="text-right py-3 px-4 font-medium text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {dataItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[hsl(var(--muted))]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.lastUpdate}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">{item.category}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">{item.schema}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{item.publisher}</td>
                      <td className="py-3 px-4 text-sm">{item.region}</td>
                      <td className="py-3 px-4 text-sm">{item.history}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <span className={getFeatureColor(item.features.btc)}>BTC</span>
                          <span className={getFeatureColor(item.features.eth)}>ETH</span>
                          <span className={getFeatureColor(item.features.bnb)}>BNB</span>
                          <span className={getFeatureColor(item.features.sol)}>SOL</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Export Data
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                <Button variant="ghost" size="sm" disabled>
                  Previous
                </Button>
                <span>Compare B/M and GL futures contracts</span>
                <Button variant="ghost" size="sm">
                  What's included in CME MDP 3.0 futures?
                </Button>
                <Button variant="ghost" size="sm">
                  Showcase all US options datasets
                </Button>
                <Button variant="ghost" size="sm">
                  Which dataset is best for volatility equity vol modeling?
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}