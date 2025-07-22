'use client'

import { useState } from 'react'
import { 
  ChevronDown, 
  MoreHorizontal,
  Eye,
  Download,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataItem {
  id: number | string
  name: string
  category: string
  schema: string
  publisher: string
  region: string
  history: string
  status: string
  lastUpdate: string
  provider?: string
  tags?: string[]
  features: {
    btc: boolean
    eth: boolean
    bnb: boolean
    sol: boolean
  }
}

interface DataGridProps {
  data: DataItem[]
  title?: string
  searchPlaceholder?: string
  filters?: string[]
  className?: string
}

export function DataGrid({ 
  data, 
  title = "Data",
  searchPlaceholder = "Search",
  filters = ["Category", "Schema", "Publisher", "Region", "Available History"],
  className 
}: DataGridProps) {
  const [searchQuery, setSearchQuery] = useState("")

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

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.publisher.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={cn("bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] flex flex-col", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            {filters.map((filter) => (
              <Button key={filter} variant="outline" size="sm">
                {filter === "Category" && <Filter className="w-4 h-4 mr-2" />}
                {filter}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            ))}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <Input 
                type="search" 
                placeholder={searchPlaceholder} 
                className="pl-10 w-64 h-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
            {filteredData.map((item) => (
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
    </div>
  )
}