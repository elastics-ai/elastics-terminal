"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, FileText, ChevronDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface SPXDrawdownChartProps {
  className?: string
}

export function SPXDrawdownChart({ className }: SPXDrawdownChartProps) {
  // Generate mock drawdown data
  const generateDrawdownData = () => {
    const data = []
    const startDate = new Date('2023-06-01')
    for (let i = 0; i < 52; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i * 7)
      data.push({
        date: date.toISOString().split('T')[0],
        drawdown: -Math.random() * 0.15,
        threshold: -0.025
      })
    }
    return data
  }

  const data = generateDrawdownData()

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">SPX Weekly Drawdown Returns vs Following Weekly Returns</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Info className="w-3 h-3 mr-1" />
              AI Suggestion
            </Badge>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          Show me how SPX behaves historically in the week following predefined weekly drawdowns.
        </div>

        <div className="h-[300px] w-full mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short' })}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: '#D1D5DB' }}
                formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
              />
              <ReferenceLine y={-0.025} stroke="#EF4444" strokeDasharray="5 5" />
              <Line 
                type="monotone" 
                dataKey="drawdown" 
                stroke="#6366F1" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Sure. Please specify the drawdown thresholds you want to use — e.g., -2%, -3%, etc.
          </div>

          <div className="bg-muted/30 rounded-md p-3">
            <p className="text-sm">Use -2%, -3%, and -5% thresholds.</p>
          </div>

          <div className="text-sm text-muted-foreground">
            Understood. I'll compute the weekly SPX returns, identify weeks with drawdowns exceeding those thresholds, and then plot the return in the following week.
          </div>

          <Card className="p-4 bg-muted/20">
            <p className="text-sm">Here's the scatter plot: X-axis shows the weekly drawdown return, Y-axis shows the following week's return. Each threshold is color-coded for clarity.</p>
          </Card>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <FileText className="w-4 h-4" />
            Show Results
          </button>
          <button className="flex items-center gap-2 text-sm text-primary font-medium">
            ● Blue for Total
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 text-sm text-purple-600 font-medium">
            ● Green for Daytime
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 text-sm text-purple-600 font-medium">
            ● Purple for Nighttime
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}