'use client'

import React, { useState, useCallback } from 'react'
import { Search, Filter, Calendar, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import debounce from 'lodash/debounce'

interface ChatHistorySearchProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: SearchFilters) => void
  className?: string
}

interface SearchFilters {
  useCase?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

const USE_CASES = [
  { value: 'portfolio_performance', label: 'Performance' },
  { value: 'risk_management', label: 'Risk' },
  { value: 'market_analysis', label: 'Market' },
  { value: 'portfolio_exposure', label: 'Exposure' },
  { value: 'event_driven', label: 'Events' },
  { value: 'options_analytics', label: 'Options' },
  { value: 'trading_strategy', label: 'Strategy' },
]

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

export const ChatHistorySearch: React.FC<ChatHistorySearchProps> = ({
  onSearch,
  onFilterChange,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUseCase, setSelectedUseCase] = useState<string>()
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query)
    }, 300),
    [onSearch]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    debouncedSearch(query)
  }

  const handleUseCaseChange = (useCase?: string) => {
    setSelectedUseCase(useCase)
    onFilterChange({
      useCase,
      dateRange: getDateRangeFilter(selectedDateRange)
    })
  }

  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range)
    onFilterChange({
      useCase: selectedUseCase,
      dateRange: getDateRangeFilter(range)
    })
  }

  const getDateRangeFilter = (range: string) => {
    const now = new Date()
    const start = new Date()
    
    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      default:
        return undefined
    }
    
    return { start, end: now }
  }

  const clearFilters = () => {
    setSelectedUseCase(undefined)
    setSelectedDateRange('all')
    onFilterChange({})
  }

  const hasActiveFilters = selectedUseCase || selectedDateRange !== 'all'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search conversations..."
          className={cn(
            'w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-800',
            'rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
            'placeholder-gray-500 text-sm'
          )}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'absolute right-2 top-1/2 transform -translate-y-1/2',
            'p-1.5 rounded hover:bg-gray-800 transition-colors',
            hasActiveFilters && 'text-primary'
          )}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
          {/* Use Case Filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Use Case</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((useCase) => (
                <button
                  key={useCase.value}
                  onClick={() => handleUseCaseChange(
                    selectedUseCase === useCase.value ? undefined : useCase.value
                  )}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full transition-colors',
                    selectedUseCase === useCase.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  )}
                >
                  {useCase.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleDateRangeChange(range.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full transition-colors',
                    selectedDateRange === range.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}