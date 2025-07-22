'use client'

import { Calendar, Clock, RefreshCw, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface RiskHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  timeRange: string
  onTimeRangeChange: (range: string) => void
}

const timeRanges = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']

export function RiskHeader({ selectedDate, onDateChange, timeRange, onTimeRangeChange }: RiskHeaderProps) {
  return (
    <div className="bg-card border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Risk</h1>
            <div className="text-sm text-muted-foreground">Monte Carlo Simulator</div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Date selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Time range selector */}
            <div className="flex bg-secondary rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={cn(
                    "px-3 py-1 text-sm rounded transition-colors",
                    timeRange === range
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export Report</DropdownMenuItem>
                <DropdownMenuItem>Configure Alerts</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metrics bar */}
        <div className="flex items-center gap-6 mt-4">
          <MetricItem label="Total Portfolio" value="$5.2M" change="+14.5%" positive />
          <MetricItem label="At Risk" value="$432K" change="-8.2%" positive={false} />
          <MetricItem label="Daily VaR" value="$28.5K" change="+2.1%" positive />
          <MetricItem label="Sharpe Ratio" value="1.82" change="+0.15" positive />
          <MetricItem label="Max Drawdown" value="-12.3%" change="-1.2%" positive={false} />
        </div>
      </div>
    </div>
  )
}

function MetricItem({ 
  label, 
  value, 
  change, 
  positive 
}: { 
  label: string
  value: string
  change: string
  positive: boolean
}) {
  return (
    <div className="flex flex-col">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold">{value}</span>
        <span className={cn(
          "text-sm",
          positive ? "text-green-500" : "text-red-500"
        )}>
          {change}
        </span>
      </div>
    </div>
  )
}