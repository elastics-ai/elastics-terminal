'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface ExposureData {
  name: string
  value: number
  percentage: number
}

interface PortfolioExposureChartProps {
  data: Record<string, number>
}

const COLORS = {
  crypto: '#6366f1',
  forex: '#8b5cf6',
  fixed_income: '#ec4899',
  commodities: '#f59e0b',
  cash: '#10b981',
  private_markets: '#06b6d4',
  equities: '#f97316'
}

export const PortfolioExposureChart: React.FC<PortfolioExposureChartProps> = ({ data }) => {
  const chartData: ExposureData[] = Object.entries(data).map(([name, value]) => ({
    name: name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    value: value * 100,
    percentage: value
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Portfolio Exposure</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(' ', '_')] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              formatter={(value: string, entry: any) => (
                <span className="text-sm">
                  {value}: <span className="font-medium">{entry.payload.value.toFixed(0)}%</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}