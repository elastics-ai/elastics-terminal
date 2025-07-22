"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from "@/lib/utils"

interface QuerySectionProps {
  className?: string
}

export function QuerySection({ className }: QuerySectionProps) {
  // Mock data for ETH performance chart
  const ethData = [
    { date: '2024-05', value: 3000 },
    { date: '2024-06', value: 3200 },
    { date: '2024-07', value: 2800 },
    { date: '2024-08', value: 3100 },
    { date: '2024-09', value: 3400 },
    { date: '2024-10', value: 3300 },
    { date: '2024-11', value: 3600 },
    { date: '2024-12', value: 3800 },
    { date: '2025-01', value: 3500 },
  ]

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Query</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Query name #1</span>
            <span className="text-sm text-muted-foreground">Show me historical ETH performance in daytime vs. nighttime without outliers. Use log returns.</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
            <Info className="w-3 h-3 mr-1" />
            Nexus used: Data source: Hyperliquid
          </Badge>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Where should I source the data from? Binance, Hyperliquid or static data from the library?</p>
          <div className="bg-muted/30 rounded-md p-3">
            <p className="text-sm">Hyperliquid</p>
          </div>
        </div>

        <div className="pt-4">
          <div className="text-sm text-muted-foreground mb-2">
            What outlier detection method would you like me to use? Percentiles, Z-score, or something else?
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ethData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ color: '#D1D5DB' }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            ✓ Use the 2.5th and 97.5th percentiles to filter out outliers.
          </Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          Got it — trimming returns outside the 95% confidence interval. Do you want to see cumulative performance or return distributions?
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <Card className="p-4 border-2 border-primary cursor-pointer hover:bg-primary/5">
            <p className="text-sm font-medium">Both. Start with cumulative performance, then show me the return distributions with Gaussian overlays.</p>
          </Card>
          <Card className="p-4 cursor-pointer hover:bg-muted/50">
            <p className="text-sm text-muted-foreground">Done. Here's the cumulative ETH performance in blue. Daytime, and Nighttime periods (filtered). Now generating a histogram of the log returns with Gaussian overlays. Daytime mean daily log return: 0.02%±0.02% with 2.48% daily volatility using their empirical mean and standard deviation.</p>
          </Card>
        </div>

        <Card className="p-4 bg-muted/30">
          <p className="text-sm">Make sure all histograms are on the same scale and clearly distinguishable.</p>
        </Card>
      </div>
    </Card>
  )
}