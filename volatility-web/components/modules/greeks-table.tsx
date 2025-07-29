'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  ArrowUp, 
  ArrowDown, 
  Minus,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface GreekData {
  name: string
  value: number
  change24h?: number
  percentOfLimit?: number
  limit?: number
  unit?: string
}

interface GreeksTableProps {
  greeks: GreekData[]
  title?: string
  showLimits?: boolean
  className?: string
}

export const GreeksTable: React.FC<GreeksTableProps> = ({
  greeks,
  title = "Greeks",
  showLimits = true,
  className
}) => {
  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3" />
    if (change < 0) return <ArrowDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const getLimitStatus = (percentOfLimit?: number) => {
    if (!percentOfLimit) return null
    
    if (percentOfLimit >= 90) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      )
    } else if (percentOfLimit >= 70) {
      return <Badge variant="outline" className="text-orange-600">Warning</Badge>
    } else if (percentOfLimit >= 50) {
      return <Badge variant="outline">Normal</Badge>
    }
    return <Badge variant="outline" className="text-green-600">Low</Badge>
  }

  const formatValue = (value: number, unit?: string) => {
    const formatted = Math.abs(value) >= 1000 
      ? `${(value / 1000).toFixed(1)}k`
      : value.toFixed(2)
    
    const prefix = value >= 0 ? '' : '-'
    return `${prefix}${unit || ''}${formatted.replace('-', '')}`
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">Real-time</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {greeks.map((greek) => (
            <div key={greek.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{greek.name}</span>
                  {greek.change24h !== undefined && (
                    <div className={cn("flex items-center gap-1 text-sm", getChangeColor(greek.change24h))}>
                      {getChangeIcon(greek.change24h)}
                      <span>{Math.abs(greek.change24h).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">
                    {formatValue(greek.value, greek.unit)}
                  </span>
                  {showLimits && greek.limit && (
                    <span className="text-sm text-muted-foreground">
                      / {formatValue(greek.limit, greek.unit)}
                    </span>
                  )}
                  {showLimits && getLimitStatus(greek.percentOfLimit)}
                </div>
              </div>
              
              {showLimits && greek.percentOfLimit !== undefined && (
                <Progress 
                  value={Math.min(greek.percentOfLimit, 100)} 
                  className={cn(
                    "h-2",
                    greek.percentOfLimit >= 90 && "bg-red-100",
                    greek.percentOfLimit >= 70 && greek.percentOfLimit < 90 && "bg-orange-100"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface AggregateGreeksProps {
  delta: number
  gamma: number
  vega: number
  theta: number
  rho: number
  totalValue?: number
  currency?: string
}

export const AggregateGreeks: React.FC<AggregateGreeksProps> = ({
  delta,
  gamma,
  vega,
  theta,
  rho,
  totalValue,
  currency = '$'
}) => {
  const greeksData: GreekData[] = [
    {
      name: 'Delta',
      value: delta,
      change24h: 2.5,
      percentOfLimit: 45,
      limit: 1000,
      unit: currency
    },
    {
      name: 'Gamma',
      value: gamma,
      change24h: -1.2,
      percentOfLimit: 72,
      limit: 500,
      unit: currency
    },
    {
      name: 'Vega',
      value: vega,
      change24h: 5.8,
      percentOfLimit: 88,
      limit: 10000,
      unit: currency
    },
    {
      name: 'Theta',
      value: theta,
      change24h: -3.1,
      percentOfLimit: 35,
      limit: 5000,
      unit: currency
    },
    {
      name: 'Rho',
      value: rho,
      change24h: 0.8,
      percentOfLimit: 25,
      limit: 2000,
      unit: currency
    }
  ]

  return (
    <div className="space-y-4">
      <GreeksTable 
        greeks={greeksData} 
        title="Aggregate Greeks"
        showLimits={true}
      />
      
      {totalValue !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </span>
              <span className="text-2xl font-bold">
                {currency}{totalValue.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Greek surface visualization component
interface GreekSurfaceData {
  greek: string
  strikes: number[]
  expiries: number[]
  values: number[][]
}

export const GreekHeatmap: React.FC<{ data: GreekSurfaceData }> = ({ data }) => {
  const getColor = (value: number, min: number, max: number) => {
    const normalized = (value - min) / (max - min)
    const hue = (1 - normalized) * 120 // 120 is green, 0 is red
    return `hsl(${hue}, 70%, 50%)`
  }

  const flatValues = data.values.flat()
  const minValue = Math.min(...flatValues)
  const maxValue = Math.max(...flatValues)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{data.greek} Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="grid gap-1" style={{
            gridTemplateColumns: `repeat(${data.strikes.length}, 1fr)`
          }}>
            {data.values.map((row, i) =>
              row.map((value, j) => (
                <div
                  key={`${i}-${j}`}
                  className="aspect-square rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: getColor(value, minValue, maxValue),
                    color: value > (maxValue + minValue) / 2 ? 'white' : 'black'
                  }}
                  title={`Strike: ${data.strikes[j]}, Expiry: ${data.expiries[i]}d, Value: ${value.toFixed(4)}`}
                >
                  {value.toFixed(2)}
                </div>
              ))
            )}
          </div>
          
          {/* Axis labels */}
          <div className="mt-2 text-center text-sm text-muted-foreground">
            Strike →
          </div>
          <div className="absolute -left-12 top-1/2 -rotate-90 text-sm text-muted-foreground">
            Expiry →
          </div>
        </div>
      </CardContent>
    </Card>
  )
}