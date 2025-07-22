"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { Info } from "lucide-react"

interface DistributionChartProps {
  className?: string
}

export function DistributionChart({ className }: DistributionChartProps) {
  // Generate distribution data
  const generateDistributionData = () => {
    const data = []
    for (let i = -0.03; i <= 0.03; i += 0.002) {
      const value = Math.exp(-Math.pow(i / 0.01, 2) / 2) * 800
      data.push({
        x: i.toFixed(3),
        frequency: Math.floor(value + Math.random() * 50),
        gaussian: value
      })
    }
    return data
  }

  const data = generateDistributionData()

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Distribution of ETH Log Returns with Gaussian Reference</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Result #2</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Returns</span>
              <span className="text-sm font-medium">6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Daytime Returns</span>
              <span className="text-sm font-medium">6</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nighttime Returns</span>
              <span className="text-sm font-medium">6</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gaussian Total</span>
              <span className="text-sm font-medium text-green-600">●</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gaussian Daytime</span>
              <span className="text-sm font-medium text-blue-600">●</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gaussian Nighttime</span>
              <span className="text-sm font-medium text-purple-600">●</span>
            </div>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis 
                dataKey="x" 
                stroke="#6B7280"
                fontSize={12}
                tickLine={false}
                domain={[-0.03, 0.03]}
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
              />
              <Bar 
                dataKey="frequency" 
                fill="#6366F1" 
                opacity={0.7}
                barSize={20}
              />
              <Line 
                type="monotone" 
                dataKey="gaussian" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}